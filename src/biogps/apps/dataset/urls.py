from django.conf.urls.defaults import *
from django.conf import settings


urlpatterns = list()
if settings.RELEASE_MODE == 'dev':
    urlpatterns += patterns('biogps.apps.dataset.views',
                             (r'^bot/(?P<geneID>.+)/$', 'DatasetBotView'),)

urlpatterns += patterns('biogps.apps.dataset.views',
    url(r'^$', 'DatasetLibraryView', name='dataset_home'),
    url(r'^new/$', 'DatasetNewView', name='dataset_new'),
    #url(r'^(?P<dataset_id>\d+)/edit/$', 'DatasetEditView', name='dataset_edit'),
    url(r'^d3/(?P<ds_id>.+)/(?P<rep_id>.+)/$', 'DatasetD3View'),

    url(r'^all/$', 'DatasetListView'),
    url(r'^tag/$', 'DatasetTagView'),

    # /species/human/
    # /tag/expression/
    # /species/human/tag/expression/
    # /tag/expression/species/human/
    url(r'^species/(?P<species>[\w-]+)(?:/tag/(?P<tag>[\w-]+))?/$', 'DatasetListView'),
    url(r'^tag/(?P<tag>[\w-]+)(?:/species/(?P<species>[\w-]+))?/$', 'DatasetListView'),

    # This gets used to generate the URLs for tags in dataset list views
    url(r'^tag/(?P<tag>[\w\s-]+)/$', 'DatasetListView', name='dataset_list_for_tag'),

    #url(r'test/$', 'test_dataset_url', name='test_dataset_url'),

    (r'search/$', 'DatasetSearchView'),
    (r'(?P<datasetID>.+)/values/$', 'DatasetValuesView'),
    (r'(?P<datasetID>.+)/chart/(?P<reporterID>[\w-]+)/$', 'DatasetStaticChartView'),
    (r'(?P<datasetID>.+)/corr/(?P<reporterID>[\w-]+)/$', 'DatasetCorrelationView'),
    url(r'^(?P<datasetID>[GSEDgsed]*.+)(?:/(?P<slug>[\w-]+))?/$', 'DatasetView', name='dataset_show'),
)
