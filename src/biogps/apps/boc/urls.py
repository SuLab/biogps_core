'''
The URLs listed here are served under /boc/
'''
from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.apps.boc.views',
    url(r'^$',
        'query',
        name='boc.query'),

    url(r'^getgeneidentifiers/$',
         'getgeneidentifiers',
        name='boc.getgeneidentifiers'),

    url(r'^gene/(?P<geneid>.+)/identifiers/$',
         'getgeneidentifiers2',
         name='boc.getgeneidentifiers2'),

    url(r'^gene/(?P<geneid>.+)/homologene/$',
         'get_homologene',
         name='boc.get_homologene'),

    url(r'^gene/(?P<geneid>.+)/$',
        'getgene',
        name='boc.getgene'),
)
