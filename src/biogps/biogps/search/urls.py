from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.search.views',
                        url(r'^$', 'search', name='search'),
                        url(r'^status/$', 'status', name='status'),
                        url(r'^mapping/$', 'get_mapping'),
                        url(r'^interval/$', 'interval', name='interval_search'),

                        url(r'^(?P<_type>.+)/$', 'search', name='search_in'),
                        )
