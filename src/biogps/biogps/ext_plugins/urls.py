from django.conf.urls import url

from biogps.ext_plugins import views


urlpatterns = [
    url(r'^geneviewer/$',
        views.grGeneViewer,
        name='grGeneViewer'),

    url(r'^description/$',
        views.grDescription,
        name='grDescription'),
    url(r'^function/$',
        views.grFunction,
        name='grFunction'),

    url(r'^symatlasbar/$',
        views.grSymatlasTable,
        name='grSymatlasTable'),

    url(r'^googlescholarproxy/$',
        views.googleScholarTmpFix,
        name='googleScholarProxy'),
]
