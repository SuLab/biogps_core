from django.conf.urls import patterns, url
from feeds import LatestPluginsRSS


urlpatterns = patterns('',
    url(r'^plugins/$', LatestPluginsRSS(), name="rss_plugins"),
)
