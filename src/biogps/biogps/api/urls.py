'''
URLS for API endpoint:  Used by angular front end.
'''

from django.conf.urls import patterns, url


urlpatterns = patterns('biogps.api.views',
    url(r'^index/stats',
        'index_stats',
        name='api.index_stats'),
)

