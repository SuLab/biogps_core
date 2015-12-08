from django.conf.urls import url
from feeds import LatestPluginsRSS


urlpatterns = [
    url(r'^plugins/$', LatestPluginsRSS(), name="rss_plugins"),
]
