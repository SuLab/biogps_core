import datetime
import os
import os.path
import random
import re

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.http import (Http404, HttpResponse,
                         HttpResponseBadRequest, HttpResponseRedirect)
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.html import strip_tags
from django.utils.http import urlencode

from biogps.apps.gene.models import Gene
from biogps.apps.layout.layout import getall, get_shared_layouts
from biogps.apps.layout.models import BiogpsGenereportLayout
from biogps.apps.plugin.models import BiogpsPlugin
from biogps.apps.stat.models import BiogpsStat
from biogps.utils.http import JSONResponse, render_to_formatted_response
from biogps.utils.detect_mobile_browser import is_mobile_browser
from biogps.utils.helper import (getCommonDataForMain,
                                 HttpResponseRedirectWithIEFix)
from biogps.www.models import BiogpsInfobox

import logging
log = logging.getLogger('biogps_prod')

cache_day = settings.CACHE_DAY
cache_week = settings.CACHE_WEEK


def index(request, **kwargs):
    '''view function for the main page.'''
    if request.method in ['GET', 'HEAD']:

        #redirect to mobile version if mobile browser detected
        bypass_mobile_detection = 'full' in request.GET
        if not bypass_mobile_detection and is_mobile_browser(request):
            return HttpResponseRedirect(reverse('m_index'))

        orig_url = kwargs.get('orig_url', request.get_full_path())

        # Deep-linked query handling
        query = request.GET.get('query', '')
        if query:
            params = {'goto': 'search',
                      'query': query}
            qtype = request.GET.get('qtype', '').lower()
            if qtype and qtype in ['symbol', 'keyword']:
                params['qtype'] = qtype

            return HttpResponseRedirectWithIEFix(request, '/#' + urlencode(params))

        d = getCommonDataForMain(request)

        # SymAtlas handling
        symatlas_orig = request.GET.get('symatlas','')
        if symatlas_orig:
            d['symatlas'] = dict(query = '', new_url = '')
            if symatlas_orig:
                #logging
                log.info('username=%s clientip=%s action=symatlas url=%s',
                            getattr(request.user,'username',''),
                            request.META.get('REMOTE_ADDR',''),
                            symatlas_orig[:1000])
                query = re.search(r'symquery\?q=(.*)$', symatlas_orig)
                if query:
                    d['symatlas']['query'] = query.group(1)

        # Default layout changing
        alt_defaultlayout = request.GET.get('layout', None)
        if alt_defaultlayout:
            try:
                if request.user.is_anonymous():
                    query_result = get_shared_layouts(request.user);
                else:
                    query_result = getall(request.user, userselectedonly=False)
                alt_layout = query_result.get(id=alt_defaultlayout)
            except BiogpsGenereportLayout.DoesNotExist:
                alt_layout = None
            if alt_layout:
                d['alt_defaultlayout'] = alt_layout.id

        # Helper functions to set up blog feed and info box
        d['blog_entries'] = get_blog_feed(request)
        d['infobox_items'] = get_info_box()

        # Add any existing URL parameters to the 'goto_url' so that they
        # persist after the login event.
        d['goto_url'] = orig_url

        if settings.DEBUG:
            from django.core.context_processors import request as request_processor
            context = RequestContext(request, {}, (request_processor,))
        else:
            context = RequestContext(request)

        return render_to_response('index_ext.html', d, context_instance=context)
#    elif request.method == 'POST':
#        return query_gene(request, via="POST")
    else:
        #any other un-supported request.method
        return HttpResponseBadRequest('Unsupported request method "%s"' % request.method)


def alternate_layout(request, altlayout):
    '''Custom URL/layout routing.
       Must be called as last line in urls.py since this is a catch-all
        view function.
    '''
    from models import BiogpsAltLayout
    altlayout = altlayout.lower()
    get_dict = request.GET.copy()
    try:
        get_dict['layout'] = BiogpsAltLayout.objects.get(layout_name__iexact=altlayout).layout_number
    except BiogpsAltLayout.DoesNotExist:
        raise Http404
    request.GET = get_dict
    return index(request, orig_url=request.get_full_path())


def mystuff(request):
    d = {}
    if (request.user and request.user.is_active):
        d = {'mylayouts': request.user.mylayouts.order_by('layout_name'),
             'myplugins': request.user.myplugins.order_by('title'),
             'mygenelists': request.user.mygenelists.order_by('name')}
    return render_to_response('mystuff.html', d)




def mytest(request):
    '''Internal test page for various debug info, only available on dev mode.
    '''
    if settings.RELEASE_MODE == 'dev':
        from django import db
        import django

        if settings.USE_UWSGI:
            import uwsgi
            uwsgi_version = uwsgi.version

        else:
            uwsgi_version = 'not used'
        request.session['enabled'] = True
        d = getCommonDataForMain(request)
        import pytz
        s1 = [pytz.__version__, pytz.__file__]
#        import docutils.core
#        import docutils.nodes
#        import docutils.parsers.rst.roles
#        s1.extend([docutils.__version__, docutils.__file__])
#        import pyxslt, libxml2
#        s1.extend([pyxslt.__file__, libxml2.__file__])
        if is_mobile_browser(request):
            s1.extend(['Mobile browser detected.<br>'
                       'HTTP_USER_AGENT: %s <br>' % request.META['HTTP_USER_AGENT']])
        #s1.extend([request.session.session_key, str(dir(request))])
        s1.extend(['DJANGO_SETTINGS_MODULE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + os.environ['DJANGO_SETTINGS_MODULE'] +'<br>' +\
                   'BOCSERVICE_URL:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + settings.BOCSERVICE_URL +'<br>' + \
                   'ES_HOST:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + str(settings.ES_HOST) +'<br>' + \
                   #'DATABASE_NAME:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + settings.DATABASE_NAME +'<br>' + \
                   'DATABASE_NAME:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + settings.DATABASES['default']['NAME'] +'<br>' + \
                   'DATABASE_ENGINE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + settings.DATABASES['default']['ENGINE'] +'<br>' + \
                   'DB version: ' + getattr(db.backend.Database, 'version', '') + '<br>' + \
                   'Django version: ' + django.get_version() + '<br>' + \
                   'mod_wsgi version: ' + '.'.join([str(x) for x in request.META.get('mod_wsgi.version',())]) + '<br>' + \
                   'uwsgi version: ' + uwsgi_version + '<br>' + \
                   'DEBUG:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + str(settings.DEBUG) +'<br>' + \
                   'HTTPS:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + str(request.is_secure()),

                   request.COOKIES.get('sessionid',''),
                   request.META,
                   request.session.items(),
                   request.session.session_key,
                   'user:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + str(request.user) +'<br>' + \
                   'user.backend:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + str(getattr(request.user,'backend',None)) +'<br>' + \
                   'openid:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + str(getattr(request.user, 'openid', None)) + '<br>' + \
                   'account_type:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + str(d['user_type']) + '<br>',
                   os.environ.items()])
        return HttpResponse('<hr>\n\n'.join([str(x) for x in s1]))
    else:
        raise Http404


def unittest(request):
    if settings.RELEASE_MODE == 'dev' and (request.META['REMOTE_ADDR']=='127.0.0.1' or request.META['REMOTE_ADDR'].startswith('172.26')):
        v1 = request.GET.get('v1', 0)
        v2 = request.GET.get('v2', 2)
        test = request.GET.get('test', "auth2.tests www.tests ext_plugins.tests")
        processes = request.GET.get('processes', 1)

        #cmd = '/projects/BioGPS/dev/python/2.5.1/bin/python manage.py test www --settings=settings_dev_unittest --verbosity=1'
        cmd = '/projects/BioGPS/dev/python/2.6.2/bin/python -Wignore::DeprecationWarning manage.py test --settings=settings_dev_unittest --verbosity=%(v1)s -- %(test)s --verbosity=%(v2)s --processes=%(processes)s'
        cmd = cmd % dict(v1=v1, v2=v2,
                         test=test,
                         processes=processes)
        orig_dir = os.getcwd()
        os.chdir(settings.ROOT_PATH)
        output =  os.popen4(cmd)[1].read()
        os.chdir(orig_dir)
        return HttpResponse('<pre>%s</pre>' % output)
    else:
        raise Http404


#def test_fileupload(request):
#    ''' This is used for testing file upload. '''
#    import base64
#    if (request.POST):
#        f = request.FILES['upfile']
#        filename = f['filename']
#        contenttype = f['content-type']
#        content = f['content']
#        if not contenttype.startswith('text'):
#            content = 'Base64 Encoded binary data:<br>' + base64.encodestring(content)
#
#        return HttpResponse(''.join(['<h2>%s:</h2><p>%s</p>' % (k, v) for k, v in [('filename', filename), ('content-type', contenttype), ('content', content)]]) + \
#                            '<h2>other notes:</h2><p>%s</p>' % request.POST['note'])
#    else:
#        return render_to_response('test_fileupload.html', {'sessionid': request.session.session_key})


#def flatpage(request, title, template, breadcrumb=None):
#    '''display flatpage like terms, about, faqs, help, download
#       support two mode of display:
#            full:       a complete html page
#            div:       a div block
#    '''
#    mode = request.GET.get('mode', '').lower()
#
#    if mode == 'div':
#        return render_to_response(template)
#    else:
#        content = render_to_string(template)
#        return render_to_response('flatpage/flatpage.html',
#                                  {'title': title, 'content': content, 'breadcrumb': breadcrumb},
#                                  context_instance=RequestContext(request))


def flatpage(request, template, breadcrumbs):
    '''display flatpage like terms, about, faq, help, download
    '''
    #add breadcrumb
    request.breadcrumbs(breadcrumbs)

    html_dictionary = {}
    if 'faq' in template:
        from biogps.utils.models import Species
        html_dictionary['species'] = Species

    return render_to_formatted_response(request,
                                        data=None,
                                        allowed_formats=['html'],
                                        html_template=template,
                                        html_dictionary=html_dictionary)


def get_tickermsgs(request):
    '''return a json array for ticker messages.'''
    out = dict(cnt_user_all=User.objects.count(),
               #cnt_user_lastweek = User.objects.filter(last_login__gte=datetime.datetime.now()-datetime.timedelta(weeks=1)).count(),
               #cnt_user_lastweek = Session.objects.filter(expire_date__gte=datetime.datetime.now()-datetime.timedelta(weeks=1)+datetime.timedelta(seconds=settings.SESSION_COOKIE_AGE)).count(),
               cnt_newuser_lastweek=User.objects.filter(date_joined__gte=datetime.datetime.now()-datetime.timedelta(weeks=1)).count(),
               cnt_plugins=BiogpsPlugin.objects.count(),
               cnt_layouts=BiogpsGenereportLayout.objects.count())
    return JSONResponse(out)


def get_blog_feed(request):
    # Prepare blog feed
    fc_file = os.path.join(settings.ROOT_PATH, '.cache/.feedcache')
    try:
        # Blog feed retrieval
        feedurl = 'http://feeds.feedburner.com/biogps'
        Max_Entries = 5

        import shelve
        from feedcache import cache
        storage = shelve.open(fc_file)
        try:
            fc = cache.Cache(storage)
            feed = fc.fetch(feedurl)
        finally:
            storage.close()

        if feed.get('status', None) in [200, 302, 301]:
            return feed.entries[:Max_Entries]
        # End feed retrieval
    except:
        import sys
        import traceback
        exc_type, exc_value, exc_tb = sys.exc_info()
        exc_tb_stack = traceback.extract_tb(exc_tb)
        exc_detail = ''
        if exc_type and len(exc_tb_stack) > 0:
            exc_detail = 'username = %s <br>clientip = %s <br>url = %s'\
                         '<br>exception = %s <br>filename = %s'\
                         '<br>lineno = %s <br>name = %s' % (
                                    getattr(request.user, 'username', ''),
                                    request.META.get('REMOTE_ADDR', ''),
                                    request.path,
                                    exc_type.__name__,
                                    exc_tb_stack[-1][0],
                                    exc_tb_stack[-1][1],
                                    exc_tb_stack[-1][2])

        email_msg = 'FeedCache encountered an error while loading BioGPS '\
                    'blog posts for the landing page. <br>Deleting '\
                    'feedcache file %s %s. <br><br>Exception detail:<br>%s'
        del_status = 0
        del_result = {0: ' failed', 1: ' succeeded'}

        # Delete problematic FeedCache file
        try:
            os.remove(fc_file)
            del_status = 1
        except OSError:
            # No FeedCache file to delete
            pass

        from django.core.mail import EmailMessage
        msg = EmailMessage(settings.EMAIL_SUBJECT_PREFIX + ' FeedCache '\
                            'error', email_msg % (fc_file,
                                                  del_result[del_status],
                                                  exc_detail),
                            settings.SERVER_EMAIL,
                            [a[1] for a in settings.MANAGERS])
        msg.content_subtype = "html"
        msg.send(fail_silently=False)


def get_info_box():
    # Usage Stat reporting
    # Load all Info box items to be passed to index page for display
    infobox_items = list()
    # List sequence is item type, title, content, detail (author, registered plugins, etc)

    # Featured
    feat_cache = 'feat_info'
    featured = cache.get(feat_cache)
    if not featured:
        featured = BiogpsInfobox.objects.filter(type="featured")
        cache.set(feat_cache, featured, cache_week)
    for i in featured:
        featured_quote_length = len(strip_tags(i.detail))
        # Check each quote's size and set its margin-top value
        featured_margin = '-15%'
        if featured_quote_length >= 130 and featured_quote_length < 200:
            # Large quote
            featured_margin = '-25%'
        elif featured_quote_length >= 200:
            # Really large quote
            featured_margin = '-30%'
        infobox_items.append(['featured', '<div><h2>Featured In</h2></div>', '%s' % (i.content), '%s' % (i.detail), featured_margin])

    # Statistics
    stats_header = '<div><h2>Statistics</h2></div>'
    infobox_items.append(['stat', stats_header, '<p><span><i>%s</i></span></p>' % (User.objects.count()), ' registered users'])
    user_cache = 'user_info'
    new_users = cache.get(user_cache)
    if not new_users:
        new_users = User.objects.filter(date_joined__gte=datetime.datetime.now()-datetime.timedelta(weeks=1)).count()
        cache.set(user_cache, new_users, cache_day)
    if new_users == 0:
        # No new users, don't display!
        pass
    elif new_users == 1:
        infobox_items.append(['stat', stats_header, '<p><span><i>%s</i></span></p>' % (new_users), ' new user in the last week'])
    else:
        infobox_items.append(['stat', stats_header, '<p><span><i>%s</i></span></p>' % (new_users), ' new users in the last week'])
    infobox_items.append(['stat', stats_header, '<p><span><i>%s</i></span></p>' % (BiogpsPlugin.objects.count()), ' registered plugins'])
    infobox_items.append(['stat', stats_header, '<p><span><i>%s</i></span></p>' % (BiogpsGenereportLayout.objects.count()), ' custom layouts'])

    # Trends
    trend_intervals = ['all_time', 'monthly', 'weekly']
    trend_models = [Gene]
    for mdl in trend_models:
        for intvl in trend_intervals:
            mdl_cache = '{}_info'.format(mdl.short_name)
            stats = cache.get(mdl_cache)
            if not stats:
                stats = BiogpsStat.objects.filter(content_type=
                            ContentType.objects.get_for_model(mdl),
                            interval=intvl).order_by('rank').filter(
                            rank__lte=10)[:10]
                cache.set(mdl_cache, stats, cache_week)
            if len(stats) > 0:
                if mdl == Gene:
                    content_title = '<div><u class="infobox-trend-title">Popular Genes ('
                    if intvl == 'all_time':
                        content_title += 'all-time'
                    elif intvl == 'monthly':
                        content_title += 'last month'
                    elif intvl == 'weekly':
                        content_title += 'last week'
                    # Build rank table
                    content_title += ')</u></div>'
                    rank_table = '{}<table>{}</table>'
                    table_rows = ''
                    for idx, val in enumerate(stats[:5]):
                        table_rows += '<tr><td>{}. <a href="http://biogps.org/gene/{}">{}</a></td><td>{}. <a href="http://biogps.org/gene/{}">{}</a></td></tr>'.format(idx + 1, val.content_object.id, val.content_object.symbol, idx + 6, stats[idx + 5].content_object.id, stats[idx + 5].content_object.symbol)
                    infobox_items.append(['trend', '<div><h2>Trends</h2></div>', rank_table.format(content_title, table_rows)])

    # User quotes
    quote_cache = 'quote_info'
    quotes = cache.get(quote_cache)
    if not quotes:
        quotes = BiogpsInfobox.objects.filter(type="quote")
        cache.set(quote_cache, quotes, cache_week)
    for i in quotes:
        quote_content = i.content
        quote_content_length = len(strip_tags(quote_content))
        quote_detail = i.detail
        quote_detail_length = len(strip_tags(quote_content))
        quote_total = quote_content_length + quote_detail_length

        # Check each quote's size and set its margin-top value
        quote_margin = '{}%'.format(quote_total * -0.07)
        infobox_items.append(['quote', '<div><h2>User Love</h2></div>', '%s' % (quote_content), '%s' % (quote_detail), quote_margin])

    # Shuffle results
    random.shuffle(infobox_items)
    return infobox_items
