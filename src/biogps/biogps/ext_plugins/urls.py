from django.conf.urls.defaults import *
from django.views.generic.simple import direct_to_template

urlpatterns = patterns('biogps.ext_plugins.views',
                       url(r'^geneviewer/$',
                           'grGeneViewer',
                           name='grGeneViewer'),

                       url(r'^description/$',
                           'grDescription',
                           name='grDescription'),
                       url(r'^function/$',
                           'grFunction',
                           name='grFunction'),

                       url(r'^symatlasbar/$',
                           'grSymatlasTable',
                           name='grSymatlasTable'),

                       url(r'^googlescholarproxy/$',
                           'googleScholarTmpFix',
                           name='googleScholarProxy'),

                      )