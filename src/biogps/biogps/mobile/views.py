import json

from django.http import HttpResponseBadRequest, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template.base import RequestContext

from biogps.boe import views as boe_views
from biogps.layout.layout import get_plugin_urls


def index(request, **kwargs):
    """
    Mobile index page.
    URL:          http://biogps.org/m/
    """

    if request.method == 'GET':
        return render_to_response('m_index.html',
                                  context_instance=RequestContext(request))
    else:
        #any other un-supported request.method
        return HttpResponseBadRequest('Unsupported request method "%s"' % request.method)


def query_gene(request):
    '''
    URL:       http://biogps.org/m/search/
       accepts POST only
       parameter: query
    '''
    rm = request.POST if request.method == 'POST' else request.GET
    if not rm.get('query', '').strip():
        return HttpResponseRedirect('/m/')

    response = boe_views.query(request, mobile=True)
    if response.status_code == 200:
        data = json.loads(response.content)
        results = data.get('data', None)
        error = data.get('error', None)
        return render_to_response('m_search.html',
                                  {'results': results,
                                   'error': error},
                                  context_instance=RequestContext(request))
    else:
        return response


def getgeneurls(request, geneid):
    '''
    URL:        http://biogps.org/m/gene/1017/
                http://biogps.org/m/gene/1017/?layout=1404
    '''
    layoutid = request.GET.get('layoutid', 83)
    layoutid = layoutid or 83   # in case layoutid was passed as '' (empty string)
    data = get_plugin_urls(request, layoutid, geneid, mobile=True)
    return render_to_response('m_geneurls.html',
                              {'results': data},
                              context_instance=RequestContext(request))
