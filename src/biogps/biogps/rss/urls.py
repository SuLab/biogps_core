from django.conf.urls.defaults import *
from feeds import LatestPluginsRSS

urlpatterns = patterns('',
    url(r'^plugins/$', LatestPluginsRSS(), name="rss_plugins"),
)