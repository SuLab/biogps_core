import os.path

from django.conf.urls import url, include
from django.conf import settings
from django.views.generic import TemplateView, RedirectView
from django.contrib.sitemaps import views as sitemap_views
from django.contrib import admin

from biogps.www import views as www_views
from biogps.www.sitemap import GenereportSitemap, FlatPageSitemap
from biogps.layout import layout
from biogps.genelist import genelist
from biogps.rating import views as rating_views
from biogps.boe import views as boe_views
from biogps.plugin import plugin
from biogps.auth2 import views as auth2_views


urlpatterns = [
    url(r'^$', www_views.index, name='mainpage'),

    url(r'^tickermsgs/$', www_views.get_tickermsgs, name='tickermsgs'),
    url(r'^mystuff/$', www_views.mystuff, name='mystuff'),

    url(r'^boe/', include('biogps.boe.urls')),
    url(r'^gene/', include('biogps.gene.urls')),
    # url(r'^api/', include('biogps.api.urls')),

    url(r'^auth/', include('biogps.auth2.urls')),  # this is through https
    url(r'^authx/', include('biogps.auth2.urls_x')),

    url('^accounts/orcid/login/$',
        auth2_views.biogps_oauth2_login,
        name='orcid_login'),
    url('^accounts/orcid/login/callback/$',
        auth2_views.biogps_oauth2_callback,
        name='orcid_callback'),

    url('^accounts/social/signup/$',
        auth2_views.social_signup,
        name='socialaccount_signup'),
    url(r'^accounts/', include('allauth.urls')),
    url(r'^account/', include('django_authopenid.urls')),
    url(r'^profile/', include('biogps.bgprofile.urls')),

    url(r'^utils/', include('biogps.bgutils.urls')),
    url(r'^ext/', include('biogps.ext_plugins.urls')),

    url(r'^friends/', include('biogps.bgfriends.urls')),
    url(r'^notices/', include('notification.urls')),
    url(r'^extdirect/', include('biogps.extdirect.urls')),
    # url(r"^announcements/", include("announcements.urls")),

    url(r'^about/$', www_views.flatpage,
        {'template': 'flatpage/about.html',
         'breadcrumbs': [('About', '/about/')]},
        name='about'),
    url(r'^terms/$', www_views.flatpage,
        {'template': 'flatpage/terms.html',
         'breadcrumbs': [('Terms of use', '/terms/')]},
        name='terms'),
    url(r'^help/$', www_views.flatpage,
        {'template': 'flatpage/help.html',
         'breadcrumbs': [('Help', '/help/')]},
        name='help'),
    url(r'^help_steps/$',
        www_views.flatpage,
        {'template': 'flatpage/help_steps.html',
         'breadcrumbs': [('Help', '/help/'), ('Steps', '/help_steps/')]},
        name='help_steps'),
    url(r'^help_openid/$', www_views.flatpage,
        {'template': 'flatpage/help_openid.html',
         'breadcrumbs': [('Help', '/help/'), ('Openid', '/help_openid/')]},
        name='help_openid'),
    url(r'^screencasts/$', www_views.flatpage,
        {'template': 'flatpage/screencasts.html',
         'breadcrumbs': [('Help', '/help/'),
                         ('Screencasts', '/screencasts/')]},
        name='screencasts'),
    url(r'^faq/$', www_views.flatpage,
        {'template': 'flatpage/faq.html',
         'breadcrumbs': [('FAQ', '/faq/')]},
        name='faq'),
    url(r'^downloads/$', www_views.flatpage,
        {'template': 'flatpage/download.html',
         'breadcrumbs': [('Downloads', '/downloads/')]},
        name='downloads'),
    url(r'^iphone/$',
        www_views.flatpage,
        {'template': 'flatpage/iphone.html',
         'breadcrumbs': [('iPhone', '/iphone/')]},
        name='iphone'),
    url(r'^api/$', www_views.flatpage,
        {'template': 'flatpage/api.html',
         'breadcrumbs': [('API', '/api/')]},
        name='api'),

    #rss feeds
    url(r'^rss/', include('biogps.rss.urls')),

    # Mobile website
    url(r'^m/', include('biogps.mobile.urls')),
    url(r'^mobile/', include('biogps.mobile.urls')),

]

if settings.RELEASE_MODE == 'dev':
    urlpatterns += [
        url(r'^test/', www_views.mytest),
        url(r'^unittest/$', www_views.unittest),
    ]
    from django.views import static as static_views
    urlpatterns += [
        url(r'^doc/(?P<path>.*)$', static_views.serve,
            {'document_root': os.path.join(settings.ROOT_PATH, 'doc')}),
    ]

#if settings.USE_UWSGI:
#    urlpatterns += [url(r'^uwsgi/', include('uwsgi_admin.urls'))]
#    from uwsgi_admin import views as uwsgi_views
#    urlpatterns += [
#        url(r'^siteadmin/uwsgi/$', uwsgi_views.index),
#        url(r'^siteadmin/uwsgi/reload/$', uwsgi_views.reload),
#    ]

if getattr(settings, 'SERVE_ASSETS', False):
    from django.contrib.staticfiles import views as sf_views
    urlpatterns += [
        url(r'^assets/(?P<path>.*)$', sf_views.serve),
    ]
    urlpatterns += [
        url(r'^favicon.ico$',
            RedirectView.as_view(url='/assets/img/favicon.ico',
                                 permanent=True))
    ]

urlpatterns += [
    url(r'^layout/$', layout.layout),
    url(r'^layout/(?P<layoutid>\d+)/renderurl/$', layout.render_plugin_urls),
    url(r'^layout/(?P<query>.+)/$', layout.layout),
    url(r'^layoutlist/$', layout.layoutlist),
    url(r'^layoutlist/all/$', layout.layoutlist_all),
    url(r'^layoutlist/(?P<query>.+)/', layout.layoutlist),
    url(r'^layouttree/$', layout.layout_tree),
]

urlpatterns += [
    url(r'^geneset/$', genelist.GeneListResource(permitted_methods=['POST'])),
    url(r'^geneset/union/$', genelist.genelist_union),
    url(r'^geneset/intersection/$', genelist.genelist_intersection),
    url(r'^geneset/download/$', genelist.genelist_download),
    url(r'^geneset/(?P<genelistid>.+)/$',
        genelist.GeneListResource(permitted_methods=['GET', 'PUT', 'DELETE'])),
    url(r'^getmygenesets/$', genelist.getmygenelists),
    url(r'^genesettree/$', genelist.genelist_tree),
]

# Redirect /library/ to /plugin/
urlpatterns += [
    url(r'^library/$',
        RedirectView.as_view(url='/plugin/', permanent=True)),
]

# Library browsing and searching URLs
urlpatterns += [
    url(r'^plugin/', include('biogps.plugin.urls')),
    # url(r'^layout2/', include('biogps.layout.urls')),
    # url(r'^genelist/', include('biogps.genelist.urls')),
    url(r'^search/', include('biogps.search.urls')),
]

# Datasets
urlpatterns += [
    url(r'^dataset/', include('biogps.dataset.urls')),
]

# redirect /genereport/<geneid>/ to /gene/<geneid>/ for back-compatibility
urlpatterns += [
    url('^genereport/(?P<geneid>[\w-]+)/$',
        RedirectView.as_view(url='/gene/%(geneid)s/', permanent=True)),
]

# /robots.txt /dtds /biositemap.rdf
urlpatterns += [
    url(r'^robots.txt$',
        TemplateView.as_view(template_name='seo/robots.txt',
                             content_type='text/plain')),
    url(r'dtds', RedirectView.as_view(
            url='http://biogps.org',
            permanent=True)),  # RSS DTDs 301 re-direct
    url(r'^biositemap.rdf$',
        TemplateView.as_view(template_name='seo/biositemap.rdf',
                             content_type='text/plain')),
]


## For Google webmaster tool verification
# for biogps.org verification
urlpatterns += [
    url(r'^googlee9fa2e25be0dbf05.html$',
        TemplateView.as_view(
            template_name='seo/googlee9fa2e25be0dbf05.html')),  # cwu
    url(r'^google6200b97dec6e7048.html$',
        TemplateView.as_view(
            template_name='seo/google6200b97dec6e7048.html')),  # asu
]

## For LiveSearch webmaster tool verification
urlpatterns += [
    url(r'^LiveSearchSiteAuth.xml$',
        TemplateView.as_view(
            template_name='seo/LiveSearchSiteAuth.xml')),  # cwu
]

## For Bing webmaster tool verification
urlpatterns += [
    url(r'^BingSiteAuth.xml$',
        TemplateView.as_view(template_name='seo/BingSiteAuth.xml')),  # cwu
]


## For Yahoo Search site expolorer verification
urlpatterns += [
    url(r'^y_key_ed4322ac06f730b4.html$',
        TemplateView.as_view(
            template_name='seo/y_key_ed4322ac06f730b4.html'
        )),  # cwu. old for biogps.gnf.org
    url(r'^y_key_7d8d0625ecb11a35.html$',
        TemplateView.as_view(
            template_name='seo/y_key_7d8d0625ecb11a35.html'
        )),  # cwu  new for biogps.org
]

## For Yahoo API Key verification
urlpatterns += [
    url(r'^MIVAECR.Jh0Gh6x1t0fQyA--.html$',
        TemplateView.as_view(template_name='seo/empty.html')),
]

# urlpatterns += [
#    url(r'^captcha/', include('captcha.urls')),
# ]

# Admin site
# this is through https
urlpatterns += [
    url(r'^siteadmin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^siteadmin/', include(admin.site.urls)),  # this is through https
]

#sitemap.xml
sitemaps = {
    'genereport': GenereportSitemap(),
    'flatpage': FlatPageSitemap(),
}

urlpatterns += [
    url(r'^sitemap.xml$',
        sitemap_views.index,
        {'sitemaps': sitemaps},
        name='django.contrib.sitemaps.views.index'),
    url(r'^sitemap-(?P<section>.+)\.xml$',
        sitemap_views.sitemap,
        {'sitemaps': sitemaps},
        name='django.contrib.sitemaps.views.sitemap'),
]

# Comments
urlpatterns += [url(r'^comment/', include('biogps.comment.urls'))]
urlpatterns += [url(r'^comment/', include('django_comments.urls'))]

# Ratings
urlpatterns += [
    url(r'^rating/(?P<modelType>.+)/(?P<objectID>\d+)/$',
        rating_views.RatingSubmitView),
]

# Favorite
urlpatterns += [url(r'^favorite/', include('biogps.favorite.urls'))]

#####legacy services are currently used by iPhone app
urlpatterns += [
    url(r'^service/search/$', boe_views.query),
]

urlpatterns += [
    url(r'^plugin_v1/(?P<pluginid>\d+)/renderurl/$', plugin.render_plugin_url),
    url(r'^plugin_v1/(?P<pluginid>\d+)/flag/$',
        plugin.flagplugin),  # remove this url after two weeks or so
]
##### end legacy services #####

# URL/layout routing - catch-all pattern, keep last!
urlpatterns += [url(r'^(?P<altlayout>.+)/$', www_views.alternate_layout)]
