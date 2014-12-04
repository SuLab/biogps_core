from django.conf.urls.defaults import *
from django.conf import settings

urlpatterns = patterns('biogps.apps.gene.views',
    url(r'^(?P<geneid>[\w\-\.]+)/$', 'genereport', name='genereport'),
)

if settings.RELEASE_MODE == 'dev':
    urlpatterns += patterns('biogps.apps.gene.views',
                            (r'^bot/(?P<geneid>.+)/$', 'genereport_for_bot'),
    )
