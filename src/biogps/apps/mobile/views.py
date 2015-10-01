from django.http import HttpResponseBadRequest, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext

from biogps.utils.helper import json
from biogps.apps.boe import views as boe_views
from biogps.apps.layout.layout import get_plugin_urls


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
    if not request.REQUEST.get('query', '').strip():
        return HttpResponseRedirect('/m/')

    response = boe_views.query(request, mobile=True)
    if response.status_code == 200:
        data = json.loads(response.content)['data']
        return render_to_response('m_search.html',
                                  {'results': data},
                                  context_instance=RequestContext(request))
    else:
        return response


def getgeneurls(request, geneid):
    '''
    URL:        http://biogps.org/m/gene/1017/
                http://biogps.org/m/gene/1017/?layout=1404
    '''
    layoutid = request.GET.get('layoutid', 83)
    data = get_plugin_urls(request, layoutid, geneid, mobile=True)
    return render_to_response('m_geneurls.html',
                              {'results': data},
                              context_instance=RequestContext(request))
