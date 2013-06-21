import os.path
from django.conf.urls.defaults import *
from django.views.generic.simple import direct_to_template
from django.conf import settings


urlpatterns = patterns('biogps.www.views',

    url(r'^$', 'index', name='mainpage'),

    url(r'^tickermsgs/$', 'get_tickermsgs', name='tickermsgs'),
    url(r'^mystuff/$', 'mystuff', name='mystuff'),

    (r'^boc/', include('biogps.apps.boc.urls')),
    (r'^boe/', include('biogps.apps.boe.urls')),
    (r'^gene/', include('biogps.apps.gene.urls')),

    (r'^auth/', include('biogps.apps.auth2.urls')),    #this is through https
    (r'^authx/', include('biogps.apps.auth2.urls_x')),

    (r'^account/', include('django_authopenid.urls')),
    (r'^profile/', include('biogps.apps.bgprofile.urls')),

    (r'^utils/', include('biogps.apps.utils.urls')),
    (r'^ext/', include('biogps.apps.ext_plugins.urls')),

    (r'^friends/', include('biogps.apps.friends.urls')),
    (r'^bbauth/', include('bbauth.urls')),
    (r'^authsub/', include('authsub.urls')),
    (r'^notices/', include('notification.urls')),
    (r'^extdirect/', include('biogps.apps.extdirect.urls')),
    #(r"^announcements/", include("announcements.urls")),


    url(r'^about/$', 'flatpage', {'template': 'flatpage/about.html',
                                  'breadcrumbs': [('About', '/about/')]}, name='about'),
    url(r'^terms/$', 'flatpage', {'template': 'flatpage/terms.html',
                                  'breadcrumbs': [('Terms of use', '/terms/')]}, name='terms'),
    url(r'^help/$', 'flatpage', {'template': 'flatpage/help.html',
                                 'breadcrumbs': [('Help', '/help/')]}, name='help'),
    url(r'^help_steps/$', 'flatpage', {'template': 'flatpage/help_steps.html',
                                       'breadcrumbs': [('Help', '/help/'), ('Steps', '/help_steps/')]}, name='help_steps'),
    url(r'^help_openid/$', 'flatpage', {'template': 'flatpage/help_openid.html',
                                        'breadcrumbs': [('Help', '/help/'), ('Openid', '/help_openid/')]}, name='help_openid'),
    url(r'^screencasts/$', 'flatpage', {'template': 'flatpage/screencasts.html',
                                        'breadcrumbs': [('Help', '/help/'), ('Screencasts', '/screencasts/')]}, name='screencasts'),
    url(r'^faq/$', 'flatpage', {'template': 'flatpage/faq.html',
                                'breadcrumbs': [('FAQ', '/faq/')]}, name='faq'),
    url(r'^downloads/$', 'flatpage', {'template': 'flatpage/download.html',
                                      'breadcrumbs': [('Downloads', '/downloads/')]}, name='downloads'),
    url(r'^iphone/$', 'flatpage', {'template': 'flatpage/iphone.html',
                                  'breadcrumbs': [('iPhone', '/iphone/')]},name='iphone'),
    url(r'^api/$', 'flatpage', {'template': 'flatpage/api.html',
                                  'breadcrumbs': [('API', '/api/')]},name='api'),

    #rss feeds
    (r'^rss/', include('biogps.apps.rss.urls')),

    # Mobile website
    (r'^m/', include('biogps.apps.mobile.urls')),
    (r'^mobile/', include('biogps.apps.mobile.urls')),

)


if settings.RELEASE_MODE == 'dev':
    urlpatterns += patterns('biogps.www.views',
                           (r'^test/', 'mytest'),
                           (r'^unittest/$', 'unittest'),
                           )
    urlpatterns += patterns("django.views.static",
                           (r'^doc/(?P<path>.*)$', 'serve',
                            {'document_root': os.path.join(settings.ROOT_PATH, 'doc')}))

if settings.USE_UWSGI:
#    urlpatterns += patterns(r'^uwsgi/', include('uwsgi_admin.urls'))
    urlpatterns += patterns('uwsgi_admin.views',
                            (r'^siteadmin/uwsgi/$', 'index'),
                            (r'^siteadmin/uwsgi/reload/$', 'reload'),
                           )

if getattr(settings, 'SERVE_ASSETS', False):
    urlpatterns += patterns("django.views.static",
                           (r'^assets/(?P<path>.*)$', 'serve',
                            {'document_root': os.path.join(settings.ROOT_PATH, 'src/assets')}))
    urlpatterns += patterns('django.views.generic.simple',
                           (r'^favicon.ico$', 'redirect_to', {'url': '/assets/img/favicon.ico'}),
                           )

urlpatterns += patterns('biogps.apps.layout.layout',
                        (r'^layout/$', 'layout'),
                        (r'^layout/(?P<layoutid>\d+)/renderurl/$', 'render_plugin_urls'),
                        (r'^layout/(?P<query>.+)/$', 'layout'),
                        (r'^layoutlist/$', 'layoutlist'),
                        (r'^layoutlist/all/$', 'layoutlist_all'),
                        (r'^layoutlist/(?P<query>.+)/', 'layoutlist'),
                        (r'^layouttree/$', 'layout_tree'),
                        )

from biogps.apps.genelist.genelist import GeneListResource
urlpatterns += patterns('biogps.apps.genelist.genelist',
                       url(r'^geneset/$', GeneListResource(permitted_methods = ['POST'])),
                       url(r'^geneset/union/$', 'genelist_union'),
                       url(r'^geneset/intersection/$', 'genelist_intersection'),
                       url(r'^geneset/download/$', 'genelist_download'),
                       url(r'^geneset/(?P<genelistid>.+)/$', GeneListResource(permitted_methods = ['GET', 'PUT', 'DELETE'])),
                       url(r'^getmygenesets/$', 'getmygenelists'),
                       url(r'^genesettree/$', 'genelist_tree'),
)

# Redirect /library/ to /plugin/
urlpatterns += patterns('django.views.generic.simple',
                       (r'^library/$', 'redirect_to', {'url': '/plugin/'}),
                       )

# Library browsing and searching URLs
urlpatterns += patterns('',
    (r'^plugin/', include('biogps.apps.plugin.urls')),
#    (r'^layout2/', include('biogps.apps.layout.urls')),
#    (r'^genelist/', include('biogps.apps.genelist.urls')),
    (r'^search/', include('biogps.apps.search.urls')),
)
# Datasets
urlpatterns += patterns('',
    (r'^dataset/', include('biogps.apps.dataset.urls')),
)

# redirect /genereport/<geneid>/ to /gene/<geneid>/ for back-compatibility
urlpatterns += patterns('django.views.generic.simple',
                        ('^genereport/(?P<geneid>[\w-]+)/$', 'redirect_to', {'url': '/gene/%(geneid)s/'}),
                       )

#/robots.txt /dtds /biositemap.rdf
urlpatterns += patterns('django.views.generic.simple',
                       (r'^robots.txt$', 'direct_to_template',
                         {'template': 'seo/robots.txt',
                          'mimetype': 'text/plain'}),
                       (r'dtds', 'redirect_to', {'url': 'http://biogps.org'}),    #RSS DTDs 301 re-direct
                       (r'^biositemap.rdf$', 'direct_to_template',
                         {'template': 'seo/biositemap.rdf',
                          'mimetype': 'text/plain'}),
                       )


##For Google webmaster tool verification
# for biogps.org verification
urlpatterns += patterns('django.views.generic.simple',
                        url(r'^googlee9fa2e25be0dbf05.html$','direct_to_template',    #cwu
                            {'template': 'seo/googlee9fa2e25be0dbf05.html'}),
                        url(r'^google6200b97dec6e7048.html$','direct_to_template',    #asu
                            {'template': 'seo/google6200b97dec6e7048.html'}))

##For LiveSearch webmaster tool verification
urlpatterns += patterns('django.views.generic.simple',
                        url(r'^LiveSearchSiteAuth.xml$','direct_to_template',
                            {'template': 'seo/LiveSearchSiteAuth.xml'}),    #cwu
                       )
##For Bing webmaster tool verification
urlpatterns += patterns('django.views.generic.simple',
                        url(r'^BingSiteAuth.xml$','direct_to_template',
                            {'template': 'seo/BingSiteAuth.xml'}),    #cwu
                       )


##For Yahoo Search site expolorer verification
urlpatterns += patterns('django.views.generic.simple',
                        url(r'^y_key_ed4322ac06f730b4.html$','direct_to_template',
                            {'template': 'seo/y_key_ed4322ac06f730b4.html'}),    #cwu. old for biogps.gnf.org
                        url(r'^y_key_7d8d0625ecb11a35.html$','direct_to_template',
                            {'template': 'seo/y_key_7d8d0625ecb11a35.html'}),    #cwu  new for biogps.org

                       )
##For Yahoo API Key verification
urlpatterns += patterns('django.views.generic.simple',
                        url(r'^MIVAECR.Jh0Gh6x1t0fQyA--.html$','direct_to_template',
                            {'template': 'seo/empty.html'}),
                       )

#urlpatterns += patterns('',
#    url(r'^captcha/', include('captcha.urls')),
#)


#Admin site
from django.contrib import admin
admin.autodiscover()
urlpatterns += patterns('',
                        (r'^siteadmin/doc/', include('django.contrib.admindocs.urls')),   # this is through https
                        (r'^siteadmin/', include(admin.site.urls)),  # this is through https
                        )

#sitemap.xml
from biogps.www.sitemap import GenereportSitemap, FlatPageSitemap
sitemaps = {
    'genereport': GenereportSitemap(),
    'flatpage': FlatPageSitemap(),
}
urlpatterns += patterns('django.contrib.sitemaps.views',
                        (r'^sitemap.xml$', 'index', {'sitemaps': sitemaps}),
                        (r'^sitemap-(?P<section>.+)\.xml$', 'sitemap', {'sitemaps': sitemaps}),
                       )

# Comments
urlpatterns += patterns('', (r'^comment/', include('biogps.apps.comment.urls')),)
urlpatterns += patterns('', (r'^comment/', include('django.contrib.comments.urls')),)

# Ratings
urlpatterns += patterns('biogps.apps.rating.views',
                        (r'^rating/(?P<modelType>.+)/(?P<objectID>\d+)/$', 'RatingSubmitView'),
                       )

# Favorite
urlpatterns += patterns('', (r'^favorite/', include('biogps.apps.favorite.urls')),)


#####legacy services are currently used by iPhone app
urlpatterns += patterns('biogps.apps.boe.views',
    (r'^service/search/$', 'query'),
)
# urlpatterns += patterns('biogps.apps.boc.views',
#     (r'^service/search/$', 'query_gene_for_iphone'),
# )

urlpatterns += patterns('biogps.apps.plugin.plugin',
    (r'^plugin_v1/(?P<pluginid>\d+)/renderurl/$', 'render_plugin_url'),
    (r'^plugin_v1/(?P<pluginid>\d+)/flag/$', 'flagplugin'),   # remove this url after two weeks or so
)
##### end legacy services #####


# URL/layout routing - catch-all pattern, keep last!
urlpatterns += patterns('biogps.www.views', (r'^(?P<altlayout>.+)/$', 'alternate_layout'),)
