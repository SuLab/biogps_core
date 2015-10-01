import types
from django.http import Http404
from django.shortcuts import render_to_response
from django.utils.http import urlencode

from biogps.utils.helper import isRobot, HttpResponseRedirectWithIEFix


def genereport(request, geneid):
    if isRobot(request):
        return genereport_for_bot(request, geneid)
    else:
#        # Strip out the 'dataset' parameter if it exists.
#        params = request.GET.copy()
#        if 'dataset' in params: del params['dataset']
#        _url = '/?' + urlencode(params) +'#'+urlencode({'goto': 'genereport',
#                                                        'id': geneid})

        # Redirect the user to the JS version of the gene report.
        _url = '/#' + urlencode({'goto': 'genereport',
                                 'id': geneid})
        return HttpResponseRedirectWithIEFix(request, _url)


def genereport_for_bot(request, geneid):
    '''The web-crawler (bot) version of gene report page:
        http://biogps.org/gene/1017

       on dev server, the bot page can be accessed direct as:
        http://localhost:8000/gene/bot/1017

    '''
    from biogps.apps.ext_plugins.views import grSymatlasTable
    from django.contrib.sites.models import Site
    from biogps.apps.dataset.views import DatasetBotView

    # #retrieve the html content from DataChart plugin
    # datachart_url = 'http://plugins.biogps.org/data_chart/data_chart_bot.cgi'

    # param = {'id': geneid}
    # try:
    #     datachart_content = svc.callRemoteService(datachart_url, param, 'GET')
    # except svc.RemoteServiceError:
    #     datachart_content = svc.RemoteServiceErrorResponse(request).content

    #retrieve the html content from DatasetBotView
    datachart_content = DatasetBotView().get(request, geneid).content
    #retrieve the html content from SymatlasTable (GeneIdentifiers) plugin
    symtab_data = grSymatlasTable(request, geneid, forbot=True)

    if type(symtab_data) is types.DictType and 'content' in symtab_data:
        symtab_content = symtab_data['content']
        symbol = symtab_data.get('symbol', '')
        desc = symtab_data.get('name', '')
        summary = symtab_data.get('summary', '')

        current_site = Site.objects.get_current()

        return render_to_response('gene/robots.html',
                                     {'geneid': geneid,
                                      'symbol': symbol,
                                      'description': desc,
                                      'summary': summary,
                                      'site': current_site,
                                      'symtab_content': symtab_content,
                                      'datachart_content': datachart_content})
    else:
        raise Http404
