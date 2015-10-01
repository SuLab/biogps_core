'''
The URLs listed here are served under /boe/
'''
from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.apps.boe.views',
    url(r'^$',
        'query',
        name='boe.query'),

    url(r'^getgeneidentifiers/$',
         'getgeneidentifiers',
        name='boe.getgeneidentifiers'),

    # url(r'^gene/(?P<geneid>.+)/identifiers/$',
    #      'getgeneidentifiers2',
    #      name='boe.getgeneidentifiers2'),

    # url(r'^gene/(?P<geneid>.+)/homologene/$',
    #      'get_homologene',
    #      name='boe.get_homologene'),

    # url(r'^gene/(?P<geneid>.+)/$',
    #     'getgene',
    #     name='boe.getgene'),
)
