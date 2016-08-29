'''
URLS for API endpoint:  Used by front end.
'''

from django.conf.urls import patterns, url


urlpatterns = patterns('biogps.api.views',
    url(r'^query/$',
        'main_query',
        name='api.query'),

    url(r'^index/stats',
        'index_stats',
        name='api.index_stats'),
)

