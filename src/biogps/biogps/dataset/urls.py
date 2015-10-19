from django.conf.urls import patterns, url
from django.conf import settings


urlpatterns = list()
if settings.RELEASE_MODE == 'dev':
    urlpatterns += patterns('biogps.dataset.views',
                             (r'^bot/(?P<geneID>.+)/$', 'DatasetBotView'),)

urlpatterns += patterns('biogps.dataset.views',
    url(r'^$', 'DatasetLibraryView', name='dataset_home'),
    url(r'^all/$', 'DatasetListView'),
    url(r'^tag/$', 'DatasetTagView'),

    # /species/human/
    # /tag/expression/
    # /species/human/tag/expression/
    # /tag/expression/species/human/
    url(r'^species/(?P<species>[\w-]+)(?:/tag/(?P<tag>[\w-]+))?/$', 'DatasetListView'),
    url(r'^tag/(?P<tag>[\w-]+)(?:/species/(?P<species>[\w-]+))?/$', 'DatasetListView'),

    # This gets used to generate the URLs for tags in dataset list views
    url(r'^tag/(?P<tag>[\'\w\s-]+)/$', 'DatasetListView', name='dataset_list_for_tag'),

    (r'search/$', 'DatasetSearchView'),
    url(r'^(?P<datasetID>[^/]+)(?:/(?P<slug>[\w-]+))?/$', 'DatasetView', name='_dataset_show'),

)
