'''
The URLs listed here are served under /m/ and /mobile/ interchangeably.
'''
from django.conf.urls import url

from biogps.mobile import views, ga


urlpatterns = [
    url(r'^$',
        views.index,
        name='m_index'),

    url(r'^search/$',
        views.query_gene,
        name='m_search'),

    url(r'^gene/(?P<geneid>[\w-]+)/$',
        views.getgeneurls,
        name='m_geneurls'),
]

urlpatterns += [
    url(r'^ga/$',
        ga.track_page_view),
]
