# Create your views here.
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import render_to_response
import os
import os.path
import re
import urllib
import httplib2

def proxy(request):

    url = request.GET.get('url', '')

    if url:
        if not re.match('^http://.+\.biogps\.org\/', url, re.I):
            return HttpResponseBadRequest('Not allowed "url" parameter: %s.' % url)

        showurl = request.GET.get('showurl',False)
        send_secure_cookies = request.GET.get('secure', False)
        if send_secure_cookies:
            headers = {'Cookie': 'secure_plugin_client_session=%s' % request.session.session_key}
        else:
            headers = {}

        h = httplib2.Http()
        try:
            response, result = h.request(url, 'GET', headers=headers)
        except httplib2.ServerNotFoundError:
            return HttpResponseBadRequest('Cannot connect to the requested <a href="%s">URL</a>.' % url )
        except httplib2.RelativeURIError:
            return HttpResponseBadRequest('Invalid "url" parameter: %s.' % url )

        if response['status'] != '200':
            return HttpResponse('Access error to this <a href="%s">url</a> (status: %s)' % (url, response['status']))

        if showurl:
            return HttpResponse(('<a href="%s" target="_blank">%s</a><br />' % (url,url)) + result)
        else:
            ctype = response.get('content-type', 'text/html')
            return HttpResponse(result, content_type=ctype)

    else:
        return HttpResponse('Missing "url" parameter.<br />')


def errorreport(request,errorreport_id):
    error_file = os.path.join(settings.ROOT_PATH, ".tmp", errorreport_id)
    if os.path.exists(error_file):
        error_report = file(error_file).read()
        #os.remove(error_file)
    else:
        error_report = '<h1>Error report is not available</h1>'

    return HttpResponse(error_report)

def showchart(request):
    charturl = request.GET.get('url', '')

    tpl = '''
    <html>
    <img src="%s">
    </html>
    '''
    return HttpResponse(tpl % charturl)

def feedbox(request):
    '''return a html code for a feed box.'''
    feedurl = 'http://feeds.feedburner.com/biogps'
    Max_Entries = 5

    import shelve
    from feedcache import cache
    storage = shelve.open(os.path.join(settings.ROOT_PATH, '.cache/.feedcache'))
    try:
        fc = cache.Cache(storage)
        feed = fc.fetch(feedurl)
    finally:
        storage.close()

    if feed.get('status',None) in [200, 302, 301]:
        return render_to_response('feedbox.html', {'feed': feed.feed,
                                                   'entries': feed.entries[:Max_Entries]})
    else:
        return HttpResponseBadRequest('<h2>Failed to access <a href="%s">this feed</a> (status: %s)</h2>' % (feedurl, feed.get('status',None)))

def set_domain_cookie(request):
    '''This is to set a "gnf.org" domain cookie used by security-aware plugins.'''
    from biogps.utils.helper import set_domain_cookie as _set_domain_cookie
    response = HttpResponse('{}')
    return _set_domain_cookie(request, response)
