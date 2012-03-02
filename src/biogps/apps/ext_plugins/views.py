import random
import string
from django.utils.html import escape
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.template.loader import render_to_string
from django.http import HttpResponse, HttpResponseBadRequest

from biogps.utils.helper import (docenabled,
                               is_valid_geneid,
                               GO_CATEGORY,
                               )
from biogps.apps.boc import boc_svc as svc


def _get_gene(request, geneid):
    """A convienent function to get gene object."""
    if not is_valid_geneid(geneid):
        return HttpResponseBadRequest('Invalid input parameters!')
    geneid = str(geneid).strip()

    ds = svc.DataService()
    try:
        geneobj = ds.getgene(geneid)
    except svc.RemoteServiceError:
        return svc.RemoteServiceErrorResponse(request)
    if not geneobj:
        return HttpResponseBadRequest('Invalid input parameters!')

    return geneobj


@docenabled
def grGeneViewer(request):
    """
    NOTE: this plugin has been replaced by "BioTrack" (GNF users) or "UCSC genome browser" plugin

    GeneViewer plugin.
    URL:          http://biogps.org/ext/geneviewer/
    Parameters:   geneid - Entrez/Ensembl GeneID
                  type - can be swfobject (default), ufo, or plain.
                  container - id of container DOM element, random string is used if not provided.
    Examples:     http://biogps.org/ext/geneviewer/?geneid=1017
                  http://biogps.org/ext/geneviewer/?geneid=1017&type=plain
                  http://biogps.org/ext/geneviewer/?geneid=1017&type=swfobject&container=win_1017
    """

    geneid = request.GET.get('geneid', '')
    container = request.GET.get('container', ''.join(random.sample(string.ascii_letters, 5)))

    return render_to_response('grGeneViewer_deprecated.html', {'geneid': geneid,
                                                               'container': container},
                              context_instance=RequestContext(request))


#    # This plugin has been replaced by "BioTrack" plugin
#    geneid = request.GET.get('geneid', '')
#    container = request.GET.get('container', ''.join(random.sample(string.ascii_letters, 5)))
#    type = request.GET.get('type', 'swfobject')
#
#    if not is_valid_geneid(geneid):
#        return HttpResponseBadRequest('Invalid input parameters!')
#    type = type.lower()
#    if type == 'swfobject':
#        tpl = 'grGeneViewer_swfobject.html'
#    elif type == 'ufo':
#        tpl = 'grGeneViewer_ufo.html'
#    elif type == 'plain':
#        tpl = 'grGeneViewer_plain.html'
#    else:
#        return HttpResponseBadRequest('Flash object can not be rendered. Wrong parameter "type": %s' % type)
#
#    return render_to_response(tpl, dict(geneid=geneid,
#                                        container=escape(container),
#                                        swfsrc='/assets/swf/GeneViewer.swf',
#                                        width='100%',
#                                        height='100%'))


@docenabled
def grDescription(request, geneid=None):
    """
    Gene Description plugin.
    URL:          http://biogps.org/ext/description/
    Parameters:   geneid - Entrez/Ensembl GeneID
    Examples:     http://biogps.org/ext/description/?geneid=1017
    """
    geneid = geneid or request.GET.get('geneid', '')

    gene_obj = _get_gene(request, geneid)
    if isinstance(gene_obj, HttpResponse):
        return gene_obj                   # in case something wrong

    if gene_obj:
        geneid_li = []
        if 'entrezgene' in gene_obj:
            geneid_li.append(str(gene_obj['entrezgene']))
        ensemblgene = gene_obj.get_ensemblgene()
        if ensemblgene:
            geneid_li.extend(svc.alwayslist(ensemblgene))
        d = dict(gene=gene_obj,
                 geneid_str=', '.join(geneid_li))

        return render_to_response('grDescription.html', d)
    else:
        return HttpResponse('<h2>No data available for gene "%s".</h2>' % geneid)


@docenabled
def grFunction(request, geneid=None):
    """
    Gene GO function plugin.
    URL:          http://biogps.gnf.org/ext/function/
    Parameters:   geneid - Entrez/Ensembl GeneID
    Examples:     http://biogps.org/ext/function/?geneid=1017
    """
    geneid = geneid or request.GET.get('geneid', '')

    gene_obj = _get_gene(request, geneid)
    if isinstance(gene_obj, HttpResponse):
        return gene_obj                   # in case something wrong

    go_keys = ['MF', 'BP', 'CC']
    if gene_obj:
        godata = gene_obj.get('go', None)
        html = ''
        if (godata):
            for k in go_keys:
                if (godata.get(k, None)):
                    html += '<h2>' + GO_CATEGORY[k] + '</h2>'
                    html += '<ul class="genereport_ul">'
                    for f in svc.alwayslist(godata[k]):
                        html += '<li>%s - %s</li>' % (f['id'], f['term'])
                    html += "</ul>"
        else:
            html = '<h2>Gene Ontology data unavailable.</h2>'
    else:
        html = '<h2>Unknown gene ID.</h2>'

    return HttpResponse(html)


@docenabled
def grSymatlasTable(request, geneid=None, forbot=False):
    """
    SymatlasTable plugin, return a page with a table similar to the symatlas interface.
    URL:          http://biogps.org/ext/symatlasbar/
    Parameters:   geneid - Entrez/Ensembl GeneID
    Examples:     http://biogps.org/ext/symatlasbar/?geneid=1017

    if forbot is True, return some extra gene data.
    """
    geneid = geneid or request.GET.get('geneid', '')
    if not geneid:
        return HttpResponseBadRequest('missing required parameters.')

    hide_species = bool(request.GET.get('hidespecies', False))
    geneobj = _get_gene(request, geneid)
    if isinstance(geneobj, HttpResponse):
        return geneobj                   # in case something wrong

    #some extra fields in geneobj
    geneobj['ensemblURLPrefix'] = '_'.join(geneobj.get_genus().split())

    if forbot:
        data = {}
        data['content'] = render_to_string('grSymatlasBar.html', {'geneobj': geneobj,
                                                                  'hide_species': hide_species})
        for attr in ['symbol', 'name', 'summary']:
            if attr in geneobj:
                data[attr] = geneobj[attr]
        return data
    else:
        return render_to_response('grSymatlasBar.html', {'geneobj': geneobj,
                                                         'hide_species': hide_species},
                                   context_instance=RequestContext(request))
