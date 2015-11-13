from django.conf.urls import url
from django.conf import settings

from biogps.dataset import views


urlpatterns = list()

if settings.RELEASE_MODE == 'dev':
    urlpatterns += [
        url(r'^bot/(?P<geneID>.+)/$', views.DatasetBotView),
    ]

urlpatterns += [
    url(r'^$', views.DatasetLibraryView, name='dataset_home'),
    url(r'^all/$', views.DatasetListView),
    url(r'^tag/$', views.DatasetTagView),

    # /species/human/
    # /tag/expression/
    # /species/human/tag/expression/
    # /tag/expression/species/human/
    url(r'^species/(?P<species>[\w-]+)(?:/tag/(?P<tag>[\w-]+))?/$',
        views.DatasetListView),
    url(r'^tag/(?P<tag>[\w-]+)(?:/species/(?P<species>[\w-]+))?/$',
        views.DatasetListView),

    # This gets used to generate the URLs for tags in dataset list views
    url(r'^tag/(?P<tag>[\'\w\s-]+)/$',
        views.DatasetListView,
        name='dataset_list_for_tag'),

    url(r'search/$', views.DatasetSearchView),
    url(r'^(?P<datasetID>[^/]+)(?:/(?P<slug>[\w-]+))?/$',
        views.DatasetView,
        name='_dataset_show'),
]
