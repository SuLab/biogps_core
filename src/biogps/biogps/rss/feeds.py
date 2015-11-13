from django.contrib.syndication.views import Feed
from django.utils.feedgenerator import Rss201rev2Feed
from biogps.plugin.models import BiogpsPlugin


class PluginsRSSGenerator(Rss201rev2Feed):
    def root_attributes(self):
        attrs = super(PluginsRSSGenerator, self).root_attributes()
        attrs['xmlns:biogps'] = 'http://biogps.org/dtds/plugin.dtd'
        return attrs

    def add_item_elements(self, handler, item):
        super(PluginsRSSGenerator, self).add_item_elements(handler, item)

        # Add custom element named 'biogps:url' to each item
        handler.addQuickElement('biogps:url', item['biogps:url'])


class LatestPluginsRSS(Feed):
    feed_type = PluginsRSSGenerator
    title = "Newest BioGPS Plugins"
    link = "http://biogps.org/plugin/"
    # Feed description
    description = "The latest plugins registered at biogps.gnf.org."
    # Item description
    description_template = "feeds/plugin_description.html"

    def items(self):
        return BiogpsPlugin.objects.get_available_by_role(
                                     'BioGPS Users').order_by('-created')[:15]

    def item_title(self, item):
        return item.title

    def item_author_name(self, item):
        return item.author

    def item_pubdate(self, item):
        if (item.created.date == item.lastmodified.date):
            return item.created
        else:
            return item.lastmodified

    def item_extra_kwargs(self, item):
        return {'biogps:url': item.url, }
