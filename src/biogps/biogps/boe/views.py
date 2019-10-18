from django.conf import settings
from django.http import Http404
from django.utils.http import urlencode
from biogps.utils.helper import (allowedrequestmethod, alwayslist,
                                 JSONResponse, species_d, taxid_d,
                                 is_valid_geneid, assembly_d,
                                 dotdict, genus_d)
from biogps.utils import log

#import httplib2
import requests
from requests.adapters import HTTPAdapter
from urllib2 import urlparse
from shlex import shlex
import re
import json
import types

species_d[9940] = 'sheep'
assembly_d['sheep'] = 'oviAri4'
genus_d['sheep'] = 'Ovis aries'

species_d[9031] = 'chicken'
assembly_d['chicken'] = 'galGal6'
genus_d['chicken'] = 'Gallus gallus'

other_supported_species = [9940, 9031]    # supported but not part of default species



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
                if hgene[0] in species_d:
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


class MyGeneInfo404(Exception):
    pass


class MyGeneInfo():
    def __init__(self, url=settings.BOESERVICE_URL):
        self.url = url
        if self.url[-1] == '/':
            self.url = self.url[:-1]
        self.url_root = self._get_url_root(self.url)
        self.s = requests.Session()
        # set max_retries
        self.s.mount(self.url, HTTPAdapter(max_retries=5))
        self.max_query = 10000
        self.step = 10000
        self.userfilter = None   # optional predefined userfilter

        self.default_species = ','.join([str(x) for x in taxid_d.values()])
        self.default_fields = ','.join(['symbol', 'name', 'taxid', 'entrezgene', 'ensemblgene', 'homologene'])
        self.id_scopes = ','.join([
            "accession",
            "alias",
            "ensemblgene",
            "ensemblprotein",
            "ensembltranscript",
            "entrezgene",
            "flybase",
            "go",
            "hgnc",
            "hprd",
            "interpro",
            "ipi",
            "mgi",
            "mim",
            "mirbase",
            "pdb",
            "pharmgkb",
            "pir",
            "prosite",
            "ratmap",
            "reagent",
            "refseq",
            "reporter",
            "retired",
            "rgd",
            "symbol",
            "tair",
            "unigene",
            "uniprot",
            "wormbase",
            "xenbase",
            "zfin"
        ])

    def _get_url_root(self, url):
        scheme, netloc, url, query, fragment = urlparse.urlsplit(self.url)
        return urlparse.urlunsplit((scheme, netloc, '', '', ''))

    def _format_list(self, a_list, sep=','):
        if isinstance(a_list, (list, tuple)):
            _out = sep.join([str(x) for x in a_list])
        else:
            _out = a_list     # a_list is already a comma separated string
        return _out

    '''
    def _get_httplib2_old(self, url, params={}):
        debug = params.pop('debug', False)
        return_raw = params.pop('return_raw', False)
        headers = {'user-agent': "Python-httplib2_biogps/%s (gzip)" % httplib2.__version__}
        if params:
            _url = url + '?' + urlencode(params)
        else:
            _url = url
        res, con = self.h.request(_url, headers=headers)
        if debug:
            return _url, res, con
        if res.status == 404:
            raise MyGeneInfo404
        else:
            assert res.status == 200, (_url, res, con)
        if return_raw:
            return con
        else:
            return json.loads(con)
    '''

    def _get(self, url, params={}):
        debug = params.pop('debug', False)
        return_raw = params.pop('return_raw', False)
        headers = {'user-agent': "Python-requests_biogps/%s (gzip)" % requests.__version__}
        if params:
            _url = url + '?' + urlencode(params)
        else:
            _url = url
        res = self.s.get(_url, headers=headers)
        if debug:
            return _url, res
        if res.status_code == 404:
            raise MyGeneInfo404
        else:
            # query error will return 400 with an error msg from mygene.info
            assert res.status_code in [200, 400], (_url, res)
        if return_raw:
            return res.content
        else:
            return res.json()

    '''
    def _post_httplib2_old(self, url, params):
        debug = params.pop('debug', False)
        return_raw = params.pop('return_raw', False)
        headers = {'content-type': 'application/x-www-form-urlencoded',
                   'user-agent': "Python-httplib2_biogps/%s (gzip)" % httplib2.__version__}
        res, con = self.h.request(url, 'POST', body=urlencode(params), headers=headers)
        if debug:
            return url, res, con
        if res.status == 404:
            raise MyGeneInfo404
        else:
            assert res.status == 200, (url, res, con)
        if return_raw:
            return con
        else:
            return json.loads(con)
    '''

    def _post(self, url, params):
        debug = params.pop('debug', False)
        return_raw = params.pop('return_raw', False)
        headers = {'content-type': 'application/x-www-form-urlencoded',
                   'user-agent': "Python-requests_biogps/%s (gzip)" % requests.__version__}
        res = self.s.post(url, data=urlencode(params), headers=headers)
        if debug:
            return url, res
        if res.status_code == 404:
            raise MyGeneInfo404
        else:
            assert res.status_code == 200, (url, res)
        if return_raw:
            return res.content
        else:
            return res.json()

    def _homologene_trimming(self, gdoc_li):
        '''A special step to remove species not included in <species_li>
           from "homologene" attributes.
           convert _id field to id field as well.
        '''
        default_species_set = set(taxid_d.values())
        for idx, gdoc in enumerate(gdoc_li):
            if gdoc:
                if '_id' in gdoc:
                    gdoc['id'] = gdoc['_id']
                    # del gdoc['_id']
                if gdoc['taxid'] in other_supported_species:
                    species_set = set([gdoc['taxid']]) | default_species_set
                else:
                    species_set = default_species_set
                hgene = gdoc.get('homologene', None)
                if hgene:
                    _genes = hgene.get('genes', None)
                    if _genes:
                        _genes_filtered = [g for g in _genes if g[0] in species_set]
                        hgene['genes'] = _genes_filtered
                        gdoc['homologene'] = hgene
                        #gdoc_li[idx] = gdoc
                gdoc_li[idx] = gdoc
        return gdoc_li

    def _querymany(self, qterms, scopes=None, fields=None, size=1000, species=None):
        _url = self.url + '/query'
        kwargs = {}
        if isinstance(qterms, (list, tuple)):
            kwargs['q'] = json.dumps(qterms)
            kwargs['jsoninput'] = 'true'
        else:
            kwargs['q'] = qterms
        kwargs['scopes'] = self._format_list(scopes or self.id_scopes)
        kwargs['fields'] = self._format_list(fields or self.default_fields)
        kwargs['size'] = size   # max 1000 hits returned
        kwargs['species'] = self._format_list(species or self.default_species)
        if self.userfilter:
            kwargs['userfilter'] = self.userfilter
        _res = self._post(_url, kwargs)
        return _res

    def querygenelist(self, geneid_li):
        '''return a list of gene objects for given gene ids (support entrez/ensembl/retired geneids).
           e.g. used in genelist.genelist module
           notfound input geneids will be ignored.
        '''
        _res = self._querymany(geneid_li,
                               scopes=['entrezgene', 'ensemblgene', 'retired'],
                               fields=['symbol', 'name', 'taxid'])
        gene_list = []
        for hit in _res:
            if not hit.get('notfound', False) and not hit.get('error', False):
                gene_list.append(hit)
        self._homologene_trimming(gene_list)
        return gene_list

    def query_by_id(self, query, species=None):
        if query:
            #_query = re.split('[\s\r\n+|,]+', query)
            _res = self._querymany(query, self.id_scopes, species=species)
            if isinstance(_res, dict) and _res.get('error', False):
                out = _res
                if out['error'] == 'timeout':
                    #give a nicer timeout error msg
                    out['error'] = "Your query times out now. Consider modify it and try again."
            else:
                gene_list = []
                notfound_list = []
                error_list = []
                for hit in _res:
                    if hit.get('notfound', False):
                        notfound_list.append(hit['query'])
                    elif hit.get('error', False):
                        error_list.append(hit['error'])
                    else:
                        gene_list.append(hit)
                self._homologene_trimming(gene_list)
                out = {"data": {"geneList": gene_list,
                                "totalCount": len(gene_list),
                                "qtype": "id"},
                       "success": True}
                if len(notfound_list) > 0:
                    out["data"]["notfound"] = notfound_list
                if len(error_list) > 0:
                    out["data"]["error"] = error_list

            return out

    def query_by_keyword(self, query, species=None):
        if query:
            kwargs = {}
            kwargs['q'] = query
            kwargs['fields'] = self.default_fields
            kwargs['species'] = species or self.default_species
            kwargs['size'] = 1000   # max 1000 hits returned
            if self.userfilter:
                kwargs['userfilter'] = self.userfilter
            _url = self.url + '/query'
            res = self._get(_url, kwargs)
            if 'error' in res:
                return res

            gene_list = self._homologene_trimming(res['hits'])
            out = {'data': {'query': query,
                            'geneList': gene_list,
                            'totalCount': len(gene_list),
                            'qtype': 'keyword'},
                   'success': True}
            return out

    def query_by_interval(self, query, species):
        if query and species:
            kwargs = {}
            kwargs['q'] = query
            kwargs['species'] = species
            kwargs['fields'] = self.default_fields
            kwargs['size'] = 1000   # max 1000 hits returned
            if self.userfilter:
                kwargs['userfilter'] = self.userfilter
            _url = self.url + '/query'
            res = self._get(_url, kwargs)
            gene_list = self._homologene_trimming(res['hits'])
            out = {'data': {'query': query,
                            'geneList': gene_list,
                            'totalCount': len(gene_list),
                            'qtype': "interval"},
                   'success': True}
            return out

    def get_gene(self, geneid, fields=None, species=None):
        _url = u'{}/gene/{}'.format(self.url, geneid)
        params = {'species': species or self.default_species}
        if fields:
            params['fields'] = self._format_list(fields)
        try:
            gene = self._get(_url, params)
        except MyGeneInfo404:
            gene = None
        if gene:
            if isinstance(gene, list):
                # in some cases of Ensembl genes matching two entrez gene ids, e.g. T26G10.8
                _n = len(gene)
                gene = gene[0]
                gene[u'warning'] = u"Matching {} genes and only the first one is returned.".format(_n)
            if int(gene.get('taxid', -1)) not in species_d:
                # if gene is not from supported species (defined in species_d)
                gene = None
            else:
                gene = self._homologene_trimming([gene])[0]

        return gene

    def _get_value(self, value, fn=None):
        if value:
            if isinstance(value, list):
                out = [fn(x) if fn else x for x in value]
            else:
                out = fn(value) if fn else value
        else:
            out = None
        return out

    def _parse_a_gene(self, _gene, mode=1):
        '''
           Parsing genedoc object into a compatible gene object as current BioGPS SL returns.
           This will be retired after full switch of CouchDB-based SL.
        '''

        geneobj = {}
        tid = _gene['taxid']
        species = species_d[tid]
        geneobj['species'] = species
        # try:
        #     geneobj['EntrezGene']=int(_gene.id)
        # except ValueError:
        #     pass

        attr_li = [('ensemblgene', 'ensembl', lambda x: x['gene']),
                   ('uniprot', 'uniprot', lambda x:x.get('Swiss-Prot', None))]
        xref_attrs = ["entrezgene", "symbol", "name", "alias", "unigene", "pdb", "pharmgkb",
                      "FLYBASE", "HGNC", "HPRD", "MGI", "MIM", "RATMAP", "RGD",
                      "TAIR", "WormBase", "ZFIN", "Xenbase"]

        attr_li.extend([(attr.lower(), attr, None) for attr in xref_attrs])
        for attr_out, attr_src, fn in attr_li:
            value = _gene.get(attr_src, None)
            if value:
                _value = self._get_value(value, fn)
                if _value:
                    geneobj[attr_out] = _value

        #refseq
        refseq = _gene.get('refseq', None)
        if refseq:
            rna = refseq.get('rna', None)
            if rna:
                geneobj['refseqmrna'] = alwayslist(rna)
            protein = refseq.get('protein', None)
            if protein:
                geneobj['refseqprotein'] = alwayslist(protein)

        #ensembl
        ensembl = _gene.get('ensembl', None)
        if ensembl:
            _ensemblprotein = []
            _ensembltranscript = []
            for _ensembl in alwayslist(ensembl):
                ensemblprotein = _ensembl.get('protein', None)
                if ensemblprotein:
                    _ensemblprotein.extend(alwayslist(ensemblprotein))
                ensembltranscript = _ensembl.get('transcript', None)
                if ensembltranscript:
                    _ensembltranscript.extend(alwayslist(ensembltranscript))

            if _ensemblprotein:
                geneobj['ensemblprotein'] = _ensemblprotein
            if _ensembltranscript:
                geneobj['ensembltranscript'] = _ensembltranscript

        #genomelocation
        gpos = _gene.get('genomic_pos', None)
        if gpos:
            if isinstance(gpos, list):
                gpos = gpos[0]
            if 'chr' in gpos:
                geneobj['chr'] = gpos['chr']
            if 'start' in gpos:
                geneobj['gstart'] = gpos['start']
            if 'end' in gpos:
                geneobj['gend'] = gpos['end']

            genomelocation_str = 'chr%s:%s-%s' % (gpos.get('chr', ''),
                                                  gpos.get('start', ''),
                                                  gpos.get('end', ''))
            if len(genomelocation_str) > 5:
                geneobj['genomelocation'] = genomelocation_str
                geneobj['assembly'] = assembly_d[species]

        return geneobj

    def get_geneidentifiers(self, geneid):
        gdoc = self.get_gene(geneid)
        if not gdoc:
            gdoc = self.get_gene(geneid, species='all')
        if gdoc:
            if isinstance(gdoc, list):     # in few cases, one id might returns multiple gdoc as a list
                gdoc = gdoc[0]             # in this case, we just take the first one

            out = {}
            #base
            taxid = int(gdoc['taxid'])
            out['EntrySpecies'] = species_d[taxid]
            out['EntryGeneID'] = gdoc['_id']

            #homologene
            hgene = gdoc.get('homologene', None)
            if hgene:
                out['HomoloGene'] = hgene['id']
                gene_li = hgene['genes']  # [(taxid, geneid),...]
            else:
                gene_li = [(taxid, gdoc['_id'])]

            #handle each gene in hgene
            species_list = []
            for tid, gid in gene_li:
                if tid == taxid:
                    _gene = gdoc
                elif tid in species_d:
                    _gene = self.get_gene(gid)
                    if _gene is None:
                        continue
                else:
                    continue

                species = species_d[tid]
                geneobj = self._parse_a_gene(_gene)

                if geneobj:
                    if species in out:
                        out[species].append(geneobj)
                    else:
                        out[species] = [geneobj]   # temp to make it compatible with current sl
                    species_list.append(species)
            out['SpeciesList'] = species_list
            return out

    @property
    def metadata(self):
        _url = self.url + '/metadata'
        return self._get(_url)


def _parse_interval_query(query):
    '''Check if the input query string matches interval search regex,
       if yes, return a dictionary with three key-value pairs:
          chr
          gstart
          gend
        , otherwise, return None.
    '''
    pattern = r'chr(?P<chr>\w+):(?P<gstart>[0-9,]+)-(?P<gend>[0-9,]+)'
    interval_query = {}
    if query:
        mat = re.search(pattern, query, re.IGNORECASE)
        if mat:
            interval_query = mat.groupdict()
            mat2 = re.search('species:(?P<species>\w+)', query, re.IGNORECASE)
            if mat2:
                species = mat2.groupdict().get('species', None)
                if species in taxid_d:
                    interval_query['species'] = species
    return interval_query


def split_queryterms(q):
    '''split input query string into list of ids.
       any of "\t\n\x0b\x0c\r|,+" as the separator,
        but perserving a phrase if quoted
        (either single or double quoted)
        more detailed rules see:
        http://docs.python.org/2/library/shlex.html#parsing-rules

        e.g. split_ids('CDK2, CDK3') --> ['CDK2', 'CDK3']
             split_ids('"CDK2, CDK3"\n CDk4')  --> ['CDK2, CDK3', 'CDK4']
        note that plain space is not a separator.
    '''
    lex = shlex(q.encode('utf8'), posix=True)
    lex.whitespace = '\t\n\x0b\x0c\r|,+'
    lex.whitespace_split = True
    lex.commenters = ''
    terms = [x.decode('utf8').strip() for x in list(lex)]
    terms = [x for x in terms if x]
    return terms


def do_query(params):
    _query = params.get('query', '').strip()
    _userfilter = params.get('userfilter', '').strip()
    _species= params.get('species', '').strip() or None
    if _query:
        res = {}
        bs = MyGeneInfo()
        if _userfilter:
            bs.userfilter = _userfilter

        interval_query_params = _parse_interval_query(_query)
        if interval_query_params:
            if 'species' not in interval_query_params:
                res = {'success': False, 'error': 'Need to specify a valid "species" parameter, e.g., "species:human".'}
            else:
                query = 'chr%(chr)s:%(gstart)s-%(gend)s' % interval_query_params
                res = bs.query_by_interval(query, interval_query_params['species'])
                res['_log'] = {'qtype': 'interval', 'species': interval_query_params['species']}
        else:
            with_wildcard = _query.find('*') != -1 or _query.find('?') != -1
            # num_terms = len(re.split(u'[\t\n\x0b\x0c\r]+', _query))    # split on whitespace but not on plain space.
            try:
                terms = split_queryterms(_query)
            except ValueError as e:
                _msg = e.message
                if e.message.find('quotation') != -1:
                    _msg += '! Or just remove the dangling quote.'
                elif e.message.find('escaped') != -1:
                    _msg += '! You probably want to remove the "\\" (backslash) from your query.'
                res = {'success': False, 'error': 'Malformed input query: {}'.format(_msg)}
                terms = None
            if terms:
                multi_terms = len(terms) > 1
                if with_wildcard and multi_terms:
                    res = {'success': False, 'error': "Please do wildcard query one at a time."}
                elif multi_terms:
                    #do id query
                    res = bs.query_by_id(terms, species=_species)
                    res['_log'] = {'qtype': 'id', 'qlen': len(_query), 'num_terms': len(terms)}

                else:
                    #do keyword query
                    res = bs.query_by_keyword(_query, species=_species)
                    res['_log'] = {'qtype': 'keyword', 'qlen': len(_query)}
    else:
        res = {'success': False, 'error': 'Invalid input parameters!'}

    return res


@allowedrequestmethod('POST', 'GET')
def query(request, mobile=False, iphone=False):
    if request.method == 'GET':
        res = do_query(request.GET)
    else:
        res = do_query(request.POST)

    # logging
    _log = {"clientip": request.META.get('REMOTE_ADDR', ''),
            "action": "search"}
    _u = getattr(request.user, 'username', None)
    if _u:
        _log['username'] = _u
    if mobile:
        _log['mobile'] = 1
    if iphone:
        _log['iphone'] = 1

    if '_log' in res:
        _log.update(res['_log'])
        del res['_log']
        log.info(' '.join([u'{}={}'.format(*x) for x in _log.items()]))

    return JSONResponse(res)


@allowedrequestmethod('GET')
def getgeneidentifiers(request, geneid=None):
    """
    Retrieve all available gene identifiers for given geneid, e.g. ensemblid, refseqid, pdb id.
    URL:          http://biogps.org/boe/getgeneidentifiers
    Parameters:   geneid - Entrez GeneID
    Examples:     http://biogps.org/boe/getgeneidentifiers/?geneid=695
    """
    geneid = geneid or request.GET.get('geneid', '').strip()
    if not is_valid_geneid(geneid):
        raise Http404

    bs = MyGeneInfo()
    gene = bs.get_geneidentifiers(geneid)
    if gene:
        log.info('username=%s clientip=%s action=gene_identifiers id=%s',
                 getattr(request.user, 'username', ''),
                 request.META.get('REMOTE_ADDR', ''), geneid)
        return JSONResponse(gene)
    else:
        raise Http404
