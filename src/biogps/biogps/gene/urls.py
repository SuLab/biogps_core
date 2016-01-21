from django.conf.urls import url
from django.conf import settings

from biogps.gene import views


urlpatterns = [
    url(r'^(?P<geneid>[\w\-\.]+)/$', views.genereport, name='genereport'),
]

if settings.RELEASE_MODE == 'dev':
    urlpatterns += [
        url(r'^bot/(?P<geneid>.+)/$', views.genereport_for_bot),
    ]
