from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.apps.plugin.plugin',
    url(r'^(?P<pluginid>\d+)/renderurl/$', 'render_plugin_url'),
    url(r'^(?P<pluginid>\d+)/flag/$', 'flagplugin'),
)

urlpatterns += patterns('biogps.apps.plugin.views',

    url(r'^$', 'PluginLibraryView', name='plugin_home'),
    url(r'^new/$', 'PluginNewView', name='plugin_new'),
    url(r'^(?P<plugin_id>\d+)/edit/$', 'PluginEditView', name='plugin_edit'),
    url(r'^(?P<plugin_id>\d+)(?:/(?P<slug>[\w-]+))?/$', 'PluginView', name='plugin_show'),

    url(r'^all/$', 'PluginListView'),
    url(r'^tag/$', 'PluginTagView'),

    # /species/human/
    # /tag/expression/
    # /species/human/tag/expression/
    # /tag/expression/species/human/
    url(r'^species/(?P<species>[\w-]+)(?:/tag/(?P<tag>[\w-]+))?/$', 'PluginListView'),
    url(r'^tag/(?P<tag>[\w-]+)(?:/species/(?P<species>[\w-]+))?/$', 'PluginListView'),

    # This gets used to generate the URLs for tags in plugin list views
    url(r'^tag/(?P<tag>[\w\s-]+)/$', 'PluginListView', name='plugin_list_for_tag'),

    url(r'test/$', 'test_plugin_url', name='test_plugin_url'),
)
