from django.conf.urls import url

from biogps.plugin import plugin, views


urlpatterns = [
    url(r'^(?P<pluginid>\d+)/renderurl/$', plugin.render_plugin_url),
    url(r'^(?P<pluginid>\d+)/flag/$', plugin.flagplugin),
]

urlpatterns += [
    url(r'^$', views.PluginLibraryView, name='plugin_home'),
    url(r'^new/$', views.PluginNewView, name='plugin_new'),
    url(r'^(?P<plugin_id>\d+)/edit/$',
        views.PluginEditView,
        name='plugin_edit'),
    url(r'^(?P<plugin_id>\d+)(?:/(?P<slug>[\w-]*))?/$',
        views.PluginView,
        name='plugin_show'),

    url(r'^all/$', views.PluginListView),
    url(r'^tag/$', views.PluginTagView),

    # /species/human/
    # /tag/expression/
    # /species/human/tag/expression/
    # /tag/expression/species/human/
    url(r'^species/(?P<species>[\w-]+)(?:/tag/(?P<tag>[\w-]+))?/$',
        views.PluginListView),
    url(r'^tag/(?P<tag>[\w-]+)(?:/species/(?P<species>[\w-]+))?/$',
        views.PluginListView),

    # This gets used to generate the URLs for tags in plugin list views
    url(r'^tag/(?P<tag>[\w\s-]+)/$',
        views.PluginListView,
        name='plugin_list_for_tag'),

    url(r'test/$', views.test_plugin_url, name='test_plugin_url'),
]
