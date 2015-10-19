from django.conf.urls import patterns, url
from django.conf import settings


urlpatterns = patterns('biogps.gene.views',
    url(r'^(?P<geneid>[\w\-\.]+)/$', 'genereport', name='genereport'),
)

if settings.RELEASE_MODE == 'dev':
    urlpatterns += patterns('biogps.gene.views',
                            (r'^bot/(?P<geneid>.+)/$', 'genereport_for_bot'),
    )
