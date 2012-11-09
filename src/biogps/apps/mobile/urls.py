'''
The URLs listed here are served under /m/ and /mobile/ interchangeably.
'''
from django.conf.urls.defaults import *
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('biogps.apps.mobile.views',
                       url(r'^$',
                           'index',
                           name='m_index'),

                       url(r'^search/$',
                           'query_gene',
                           name='m_search'),

                       url(r'^gene/(?P<geneid>[\w-]+)/$',
                           'getgeneurls',
                           name='m_geneurls'),
)

urlpatterns += patterns('biogps.apps.mobile.ga',
                    url(r'^ga/$',
                        'track_page_view'),
)
