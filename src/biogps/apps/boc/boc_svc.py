'''
This is a wrapper for data services provided by BOC service layer (CouchDB).
'''
import httplib2
import os.path
import sys
import types

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import render_to_response
from django.template.loader import render_to_string
from django.template import RequestContext
from django.utils.http import urlencode
from django.utils.encoding import smart_str

from biogps.utils.helper import (mkErrorReport, json, dotdict,
                                 genus_d, species_d, assembly_d)
#from biogps.apps.service import biogps_svc as sl_svc

import logging
log = logging.getLogger('biogps')


def reverse_proxy(request, url, contentonly=False):
    http = httplib2.Http()
    if request.method == 'GET':
        res, con = http.request(url)
    else:
        res, con = http.request(url, method=request.method,
                                     body=request.raw_post_data,
                                     headers={'content-type': 'application/x-www-form-urlencoded'})
    if contentonly:
        return con
    else:
        return HttpResponse(content=con,
                            status=res.status,
                            content_type=res['content-type'])


class RemoteServiceError(Exception):
    pass


def callRemoteService(url, param=None, method='GET',
                      credentials=(), forcenocache=False,
                      validstatuscode=200, headers={},
                      returnmode='content', debug=False, httpdebuglevel=0):
    """Make a remote service call and return received content on 200.
       Parameters:
           credentials  -- a tuple of (username, password).
           validstatuscode -- a tuple of valid status codes or just a integer if only one
           headers -- extra headers to send
           returnmode -- "content": return content only on valid status codes
                         "response": return response only on valid status codes
                         "both": return (response,content) tuple on valid status codes
                         "debug" return html table with debug information
           debug -- if True, print the information about the request.
    """
    timeout = None  # 1min
    if (param):
        try:
            _param = urlencode(param)
        except:
            if type(param) is type(''):
                _param = param
            else:
                raise
    else:
        _param = ''

    if not method in ['GET', 'POST', 'PUT', 'DELETE', 'HEAD']:
        raise ValueError('Unknown request method "%s"' % method)

    httplib2.debuglevel = httpdebuglevel
    if not forcenocache and settings.HTTPLIB2_CACHE:
        h = httplib2.Http(cache=os.path.join(settings.ROOT_PATH, settings.HTTPLIB2_CACHE), timeout=timeout)
    else:
        h = httplib2.Http(timeout=timeout)
    if credentials and len(credentials) == 2:
        h.add_credentials(*credentials)

    if debug:
        print 'url: ', url
        print 'param: ', param
        print 'method: ', method
        if credentials:
            print 'credentials: ', credentials

    if method == 'GET':
        response, content = h.request(url + "?" + _param, headers=headers)
    #elif method == 'POST' or method == 'PUT':
    elif method in ['POST', 'PUT', 'DELETE']:
        headers.update({'Content-type': 'application/x-www-form-urlencoded'})
        response, content = h.request(url, method, _param, headers=headers)
    else:
        response, content = h.request(url, method, _param, headers=headers)

    if debug:
        print 'Response: \n', '\n'.join([': '.join(x) for x in response.items()])
        print 'Content: \n', content

    if type(validstatuscode) is types.IntType:
        success = response.status == validstatuscode
    else:
        success = response.status in validstatuscode

    if success:
        if returnmode == 'content':
            return content
        elif returnmode == 'response':
            return response
        elif returnmode == 'debug':
            data = {'url': url,
                    'param': _param,
                    'method': method}
            return render_to_response('remoteservice_debug.html', data)
        else:
            return (response, content)
    else:
        err_data = {'status': response.status,
                   'content': content,
                   'url': url,
                   'param': _param,
                   'method': method}
        if credentials and len(credentials) == 2:
            err_data['credentials'] = (credentials[0], '<user_pwd>')
        if headers:
            err_data['headers'] = headers

        raise RemoteServiceError(err_data)


def RemoteServiceErrorResponse(request, format='auto'):
    '''return a HttpResponseServerError with error information returned by RemoteServiceError.
           format  -- json
                      html
                      auto  (default)
    '''
    #err_data = sys.exc_value.message
    err_data = sys.exc_value.args[0]

    if format == 'auto':
        format = 'json' if request.is_ajax() else 'html'

    if settings.DEBUG:
        report = render_to_string('remoteservice_error.html', err_data)
        errorreport_id = mkErrorReport(report)
    else:
        log.error('username=%s clientip=%s url=%s, exception=RemoteServiceError serviceurl=%s param=%s method=%s status=%s',
                   getattr(request.user, 'username', ''),
                   request.META.get('REMOTE_ADDR', ''),
                   request.META.get('PATH_INFO', request.META.get('SCRIPT_URL', '')),
                   err_data.get('url', ''),
                   err_data.get('param', ''),
                   err_data.get('method', ''),
                   err_data['status'])
        if getattr(settings, 'REMOTESERVICEERROR_EMAIL', ()):
            from django.core.mail import EmailMessage
            from django.core.context_processors import request as request_processor
            subject = settings.EMAIL_SUBJECT_PREFIX + 'RemoteServiceError (%s IP): %s' % ((request.META.get('REMOTE_ADDR') in settings.INTERNAL_IPS and 'internal' or 'EXTERNAL'), request.path)
            message = render_to_string('remoteservice_error.html', err_data,
                                       context_instance=RequestContext(request, {}, (request_processor,)))
            msg = EmailMessage(subject, message, settings.SERVER_EMAIL, [a[1] for a in settings.REMOTESERVICEERROR_EMAIL])
            msg.content_subtype = "html"
            msg.send(fail_silently=True)
        errorreport_id = None

    #Check if the SL host itself is alive or not
    ds = DataService()
    if not ds.isAlive():
        error_msg = 'Data Service host is currently down. The site administrators has been notified. Please try again later.'
        return HttpResponseBadRequest(render_to_string('500.html'))
    else:
        error_msg = ''

    if format == 'json':
        json_response = json.dumps({'success': False,
                                    'error': {'error_code': err_data['status'],
                                              'error_msg': error_msg,
                                              'errorreport_id': errorreport_id}})
        return HttpResponse(json_response, mimetype='application/json')
    else:
        errmsg = '<h2>Fail to access remote service</h2>'
        if settings.DEBUG:
            errmsg += 'click to view the <a href="/utils/errorreport/%s">error report</a>.' % errorreport_id
        return HttpResponseBadRequest(errmsg)


def alwayslist(value):
    """If input value if not a list/tuple type, return it as a single value list."""
    if type(value) in (types.ListType, types.TupleType):
        return value
    else:
        return [value]


class Gene(dotdict):
    '''A extension to dictionary to hold all gene annotation data and add more functions.'''

    @property
    def id(self):
        return self['_id']

    def _get_value(self, value, fn=None):
        if value:
            if type(value) is types.ListType:
                out = [fn(x) if fn else x for x in value]
            else:
                out = fn(value) if fn else value
        else:
            out = None
        return out

    def get_genomelocation_string(self):
        '''return gene's genomic location string in a format of chrX:xxx-yyy'''
        def cvt(d):
            if ('chr' in d and 'start' in d and 'end' in d):
                return ('chr%(chr)s:%(start)d-%(end)d' % d)
            else:
                return ''
        return self._get_value(self.get('genomic_pos', None), cvt)

    def get_species(self, taxid=None):
        tid = int(taxid or self['taxid'])    #need to store int taxid for ensembl only gene at loadloading
        return species_d[tid]

    def get_genus(self):
        return genus_d[self.get_species()]

    def get_genomeassembly(self):
        return assembly_d[self.get_species()]

    def get_homologene(self):
        if 'homologene' in self:
            hgenes = []
            for hgene in self['homologene']['genes']:
                hgenes.append({'species': self.get_species(hgene[0]),
                                'taxid': hgene[0],
                                'geneid': hgene[1]})
            return {'id': self['homologene']['id'],
                    'genes': hgenes}

    def get_ensemblgene(self):
        """return the ensembl gene id (or a list if multiple)."""
        ensembl = self.get('ensembl', None)
        out = []
        if ensembl:
            for _ensembl in alwayslist(ensembl):
                out.append(_ensembl['gene'])
            return out[0] if len(out) == 1 else out

    def get_geneidentifiers(self):
        '''
           Parsing genedoc object into a compatible gene object as current BioGPS SL returns.
           This will be retired after full switch of CouchDB-based SL.
        '''
        geneobj = {}
        geneobj['species'] = self.get_species()

        #these attrs should be included without changing either the name or the value
        id_attrs = ['entrezgene', 'symbol', 'unigene', 'pdb', 'taxid',
                   'ZFIN', 'RGD', 'MIM', 'FLYBASE', 'TAIR','WormBase', 'MGI', 'HPRD', 'HGNC']
        #these attrs should be included by applying a name change or simple value cvt fn
        attr_li = [('aliases', 'synonyms', None),
                   ('uniprot', 'uniprot', lambda x:x.get('Swiss-Prot', None))
                  ]
        attr_li.extend([(attr, attr, None) for attr in id_attrs])
        for attr_out, attr_src, fn in attr_li:
            value = self.get(attr_src, None)
            if value:
                _value = self._get_value(value, fn)
                if _value:
                    geneobj[attr_out.lower()] = _value       #all output attrs are lower-case.

        #special handling for Uniprot (remove dup and the first one only if multiple found)
        #on next dataload, it should be fixed at data level
        if "uniprot" in geneobj and type(geneobj['uniprot']) is types.ListType and len(geneobj['uniprot'])>0:
            geneobj['uniprot'] = sorted(geneobj['uniprot'])[0]

        #refseq
        refseq = self.get('refseq', None)
        if refseq:
            rna = refseq.get('rna', None)
            if rna:
                geneobj['refseq_mrna'] = alwayslist(rna)
            protein = refseq.get('protein', None)
            if protein:
                geneobj['refseq_protein'] = alwayslist(protein)

        #ensembl
        ensembl = self.get('ensembl', None)
        if ensembl:
            _ensemblgene = []
            _ensembltranscript = []
            _ensemblprotein = []
            for _ensembl in alwayslist(ensembl):
                _ensemblgene.append(_ensembl['gene'])
                _ensembltranscript.extend(alwayslist(_ensembl['transcript']))
                _ensemblprotein.extend(alwayslist(_ensembl['protein']))
            _ensemblgene =  _ensemblgene[0] if len(_ensemblgene) == 1 else _ensemblgene
            _ensembltranscript =  _ensembltranscript[0] if len(_ensembltranscript) == 1 else _ensembltranscript
            _ensemblprotein =  _ensemblprotein[0] if len(_ensemblprotein) == 1 else _ensemblprotein
            geneobj['ensemblgene'] = _ensemblgene
            geneobj['ensembltranscript'] = _ensembltranscript
            geneobj['ensemblprotein'] = _ensemblprotein

        #genomelocation
        gpos = self.get('genomic_pos', None)
        if gpos:
            if type(gpos) is types.ListType:         # omit multiple mapping locations, always use the first one here.
               gpos=gpos[0]
            if gpos.has_key('chr'):
                geneobj['chr'] = gpos['chr']
            if gpos.has_key('start'):
                geneobj['gstart'] = gpos['start']
            if gpos.has_key('end'):
                geneobj['gend'] = gpos['end']

            genomelocation_str = self.get_genomelocation_string()
            if genomelocation_str:
                geneobj['genomelocation'] = genomelocation_str
        #genomeassembly
        geneobj['assembly'] = self.get_genomeassembly()

        return geneobj


class DataService:
    """A wrapper for all data services provided by BOC service layer (CouchDB)."""

    def _absurl(self, path):
        '''return absolute url'''
        return settings.BOCSERVICE_URL + path

    def isAlive(self):
        '''
        return True/False for if SL host is alive or not.
               checking is based a request to /status.
        '''
        try:
            response = callRemoteService(self._absurl('/status'), method='HEAD', returnmode='response')
            return response.status == 200
        except RemoteServiceError:
            return False

    def getgene(self, geneid, **param):
        url = self._absurl('/gene/%s' % smart_str(geneid))
        res, con = callRemoteService(url, param=param, validstatuscode=[200, 404], returnmode='both')
        if res.status == 200:
            _data = json.loads(con)
            if type(_data) is types.ListType:
                #input geneid matches more than one gene documents
                #e.g. one Ensembl Gene ID matches two Entrez Gene IDs (ENSMUSG00000078866)
                #For now, we just take the first one. We need to handle it in a better way
                #TODO: handle multiple genes here
                _data = _data[0]
            return Gene(_data)

    def getgene2(self, geneid):
        """This returns a proper formatted gene dictionary for rendering plugin urls.
           Note: this is still an old format of gene dictionary, subject to change soon.
        """
        url = self._absurl('/boc/bgps/gene/%s' % smart_str(geneid))
        res, con = callRemoteService(url, validstatuscode=[200, 404], returnmode='both')
        if res.status == 200:
            return json.loads(con)

    def querygene(self, **param):
        url = self._absurl('/boc')
        param['format'] = 'json'
        con = callRemoteService(url, param=param, method='POST', returnmode='content')
        return json.loads(con)

    def querygenelist(self, geneid_li):
        '''return a list of gene objects for given gene ids (support entrez/ensembl/retired geneids).
        '''
        query = '\r\n'.join([str(x) for x in geneid_li])
        genelist_data = self.querygene(query=query, scope='entrezgene,ensemblgene,retired')
        return genelist_data

    def getDataSetList(self, geneid, username=None, format='json', load_internal_reporters=False):
        ''' ##deprecated##
            Given a geneid, it returns a list of available datasets.
            if load_internal_reporters is True, e.g. GNF users, load internal reporters as well
            (currently from a local file)
        '''
        reporter_li = [geneid]      # geneid is always in the list as the reporter
        #step 1 get a list of reporters for given geneid
        g = self.getgene(geneid, filter='reporter,refseq.rna')
        ### include probeset ids into reporter_li
        reporter_d = g.get('reporter', None) if g else None
        if reporter_d:
            for platform in reporter_d:
                reporter_li.extend(alwayslist(reporter_d[platform]))
        ### include refseq ids into reporter_li
        if 'refseq' in g and 'rna' in g['refseq']:
            reporter_li.extend([rid.split('.')[0] for rid in alwayslist(g['refseq']['rna'])])
        print reporter_li
        #load internal reporters if needed
        if load_internal_reporters:
            import anydbm
            try:
                db = anydbm.open(os.path.join(settings.ROOT_PATH, '.cache/internal_reporters.db'), 'r')
                _internal_reporters = db.get(str(geneid), [])
                reporter_li.extend(alwayslist(_internal_reporters))
                db.close()
            except anydbm.error:
                # continue without internal reporters if any error.
                pass

        #step 2 pass reporter list to SL
        if reporter_li:
            ds = sl_svc.DataService()
            con = ds.GetDataSetList2(username=username, reporters=reporter_li, format=format)
            if format=='xml':
                return con
            else:
                if con:
                    dataset_li = json.loads(con)
                else:
                    dataset_li = []
                return dataset_li


