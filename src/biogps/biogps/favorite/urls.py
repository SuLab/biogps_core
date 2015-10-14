from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.favorite.views',
    url(r'^$', 'FavoriteView', name='FavoriteView'),
    url(r'^(?P<modelType>.+)/(?P<objectID>\d+)/$', 'FavoriteSubmitView', name='FavoriteSubmitView'),
    url(r'^(?P<modelType>.+)/$', 'FavoriteObjectView', name='FavoriteObjectView'),
)
