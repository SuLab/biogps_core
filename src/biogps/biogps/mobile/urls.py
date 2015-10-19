'''
The URLs listed here are served under /m/ and /mobile/ interchangeably.
'''
from django.conf.urls import patterns, url


urlpatterns = patterns('biogps.mobile.views',
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

urlpatterns += patterns('biogps.mobile.ga',
                    url(r'^ga/$',
                        'track_page_view'),
)
