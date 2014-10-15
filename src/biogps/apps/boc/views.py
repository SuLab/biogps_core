from django.conf import settings
from django.http import Http404, HttpResponse
from django.utils.http import urlencode
from django.utils.encoding import smart_str
from biogps.utils.helper import (allowedrequestmethod,
                                 JSONResponse,
                                 is_valid_geneid, assembly_d)
from biogps.utils import log
import boc_svc as svc

import httplib2
import re


def reverse_proxy(request, url, contentonly=False):
    http = httplib2.Http()
    if request.method == 'GET':
        res, con = http.request(url)
    else:
        res, con = http.request(url, method=request.method,
                                     # need to encode as "UTF-8" in case urlencode error on non-ascii characters
                                     # Ref http://stackoverflow.com/questions/3121186/error-with-urlencode-in-python
#                                     body=urllib.urlencode(dict([(k, v.encode("utf-8")) for k,v in request.POST.items()])),
                                     body=urlencode(request.POST),   # can just use django's urlencode, which can handle unicode.
#                                     body=request.raw_post_data,   # works for normal request, but for test client, somehow this attribute is always empty
                                     headers={'content-type': 'application/x-www-form-urlencoded'})
    if contentonly:
        return con
    else:
        return HttpResponse(content=con,
                            status=res.status,
                            content_type=res.get('content-type', None))


def query(request, mobile=False, iphone=False):
    log_query(request, mobile=mobile, iphone=iphone)
    redirect_to = settings.BOCSERVICE_URL + '/boc/bgps/'
    if request.method == 'GET':
#        redirect_to += '?' + urllib.urlencode(request.GET)   # this is not working for Unicode query string.
#        redirect_to += '?' + urllib.urlencode(dict([(k, v.encode("utf-8")) for k,v in request.GET.items()]))
        redirect_to += '?' + urlencode(request.GET)  # just use django's urlencode, which is basically same as the above line

    return reverse_proxy(request, redirect_to)


def query_gene_for_iphone(request):
    """this view function is mapped to legacy /service/search/, used by v1 iphone app only.
    """
    return query(request, iphone=True)


@allowedrequestmethod('GET')
def getgeneidentifiers(request, geneid=None):
    """
    Retrieve all available gene identifiers for given geneid, e.g. ensemblid, refseqid, pdb id.
    URL:          http://biogps.org/boc/getgeneidentifiers
    Parameters:   geneid - Entrez GeneID
    Examples:     http://biogps.gnf.org/boc/getgeneidentifiers/?geneid=695
    """
    geneid = geneid or request.GET.get('geneid', '')
    if not is_valid_geneid(geneid):
        raise Http404

    log.info('username=%s clientip=%s action=gene_identifiers id=%s',
             getattr(request.user, 'username', ''),
             request.META.get('REMOTE_ADDR', ''), geneid)
    return reverse_proxy(request, settings.BOCSERVICE_URL+'/boc/bgps/gene/%s' % smart_str(geneid))

@allowedrequestmethod('GET')
def getgeneidentifiers2(request, geneid=None):
    """
    Retrieve all available gene identifiers for given geneid, e.g. ensemblid, refseqid, pdb id.
    URL:          http://biogps.org/boc/gene/<geneid>/identifiers/
    Parameters:   geneid - Entrez GeneID
    Examples:     http://biogps.gnf.org/boc/gene/695/identifiers/
    """
    geneid = geneid or request.GET.get('geneid', '')
    if not is_valid_geneid(geneid):
        raise Http404

    ds = svc.DataService()
    gene = ds.getgene(geneid)
    if gene:
        return JSONResponse(gene.get_geneidentifiers())
    else:
        raise Http404

@allowedrequestmethod('GET')
def get_homologene(request, geneid=None):
    """
    Retrieve homologene group for given geneid.
    URL:          http://biogps.gnf.org/boc/gene/<geneid>/homologene/
    Parameters:   geneid - Entrez GeneID
    Examples:     http://biogps.gnf.org/boc/gene/695/homologene/
        returned JSON object has two properties:
             id:           homologene id
             genes:        a list of genes in the homologene group
        if no homologene avaialble, "id" is null and "genes" constains just the
        input gene.

    """
    geneid = geneid or request.GET.get('geneid', '')
    if not is_valid_geneid(geneid):
        raise Http404

    ds = svc.DataService()
    gene = ds.getgene(geneid)
    if gene:
        data = gene.get_homologene()
        if not data:
            data = {'id': None,
                    'genes': [{'species': gene.get_species(gene.taxid),
                               'taxid': gene.taxid,
                               'geneid': gene.id}]}
        return JSONResponse(data)
    else:
        raise Http404


@allowedrequestmethod('GET')
def getgene(request, geneid):
    params = urlencode(request.GET)
    if params:
        params = '?'+params
    return reverse_proxy(request, settings.BOCSERVICE_URL + '/gene/%s%s' % (smart_str(geneid), params))


def log_query(request, mobile=False, iphone=False):
    params = request.POST or request.GET
    searchby = params.get('searchby', 'searchbyanno').lower()    # valid values: searchbyanno or searchbyinterval
    if searchby == 'searchbyanno':
        _query = params.get('query', '').strip()
        qtype = params.get('qtype', 'symbolanno')
        qtype = {'symbolanno': 'id',
                 'keyword': 'keyword'}.get(qtype, None)
        if _query and qtype in ['id', 'keyword']:
            if qtype == 'id':
                query = re.sub('[\s\r\n+|,]+', '\n', _query)
            elif qtype == 'keyword':
                query = '\n'.join([x.strip() for x in _query.split('\n')])

            #logging
            logmsg1 = 'username=%s clientip=%s action=search searchby=anno qtype=%s qlen=%d' % \
                       (getattr(request.user, 'username', ''),
                        request.META.get('REMOTE_ADDR', ''),
                        qtype,
                        len(query))
            #logging query stat
            logmsg2 = 'action=query searchby=anno qtype=%s query=%s num_terms=%s num_hits=%s' % \
                        (qtype,
                         #'|'.join(query.split('\r\n'))[:1000],    # this is normalized query
                         _query[:1000].replace(' ', '_'),                            # this is raw query
                         len(query.split('\n')),
                         'NA')
            if mobile:
                # add an additional field for mobile
                logmsg1 += ' mobile=1'
                logmsg2 += ' mobile=1'

            if iphone:
                # add an additional field for mobile
                logmsg1 += ' iphone=1'
                logmsg2 += ' iphone=1'

            log.info(logmsg1)
            log.info(logmsg2)

    elif searchby == 'searchbyinterval':
        species = params.get('genomeassembly')
        #logging
        logmsg = 'username=%s clientip=%s action=search searchby=interval assembly=%s' % \
                   (getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    assembly_d.get(species, ''))
        if mobile:
            # add an additional field for mobile
            logmsg += ' mobile=1'
        log.info(log)

