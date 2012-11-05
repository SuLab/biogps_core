'''Models definition for BioGPS plugins.'''
import re
from django.db import models
#from biogps.utils.fields import AutoSlugField
from django_extensions.db.fields import AutoSlugField
from django.template.defaultfilters import slugify
import tagging
from biogps.apps.auth2.models import UserProfile
from biogps.utils.const import AVAILABLE_SPECIES
from biogps.utils.models import BioGPSModel, Species
from biogps.utils.fields.jsonfield import JSONField
from biogps.apps.search.build_index import set_on_the_fly_indexing

from fields import SpeciesField

class BiogpsPlugin(BioGPSModel):
    '''Model definition for BioGPSPlugin.'''
    title = models.CharField(max_length=100)
    url = models.CharField(max_length=500)
    ownerprofile = models.ForeignKey(UserProfile, to_field='sid',
                                     db_column='authorid')
    author = models.CharField(max_length=100)
    type = models.CharField(max_length=20)
    options = JSONField(blank=True, editable=False)
    description = models.TextField(blank=True)
    short_description = models.CharField(blank=True, max_length=140)
    lastmodified = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    slug = AutoSlugField(populate_from='title')
    species = SpeciesField(max_length=1000)

    #required setting for ModelWithPermission and PermissionManager working
    object_type = 'P'
    #short_name will be used as the index_type for ES indexing
    short_name = 'plugin'

    class Meta:
        permissions = (
            ("can_share_plugin", "Can share plugins with others."),
        )
        ordering = ("title",)
        get_latest_by = 'lastmodified'

    def __unicode__(self):
        return u'"%s" by "%s"' % (self.title, self.author)

    @models.permalink
    def get_absolute_url(self):
        """ Returns the appropriate URL for this plugin. """
        _slug = slugify(self.title)
        if _slug:
            return ('plugin_show', [str(self.id), _slug])
        else:
            return ('plugin_show', [str(self.id),])

    def object_cvt(self, mode='ajax'):
        '''A helper function to convert a BiogpsPlugin object to a simplified
            python dictionary, with all values in python's primary types only.
            Such a dictionary can be passed directly to fulltext indexer or
            serializer for ajax return.

          @param mode: can be one of ['ajax', 'es'], used to return slightly
                         different dictionary for each purpose.
          @return: an python dictionary
        '''
        extra_attrs = {'name': 'title',
                       'AS_IS': ['description', 'short_description',
                                 'species', 'type', 'url', 'shortUrl',
                                 'usage_data', 'options']}
        out = self._object_cvt(extra_attrs=extra_attrs, mode=mode)
        out['popularity'] = self.popularity.score
        return out

    #==========================================================================
    # methods specific for this model
    #==========================================================================
    @property
    def shortUrl(self):
        '''Extracts only the domain from a URL.  Used when displaying the
          'small' plugin template.  It works by doing 2 RegEx substitutions to:
               1. Strip out everything up to and including ://
               2. Strip out everything after and including the next /
        '''
        p = re.compile('.*\:\/\/')
        p2 = re.compile('\/.*')
        url = p2.sub('', p.sub('', self.url))
        return 'biogps.org' if url == '' else url

    def permissionClass(self):
        perm = self.get_role_permission(returnsorted=True,
                                        returnshortname=True)
        return perm[0] if perm else 'myself'

    def uses_all_species(self):
        '''Confirm whether this plugin is available for all species or not.
           Returns True when the instance's species field is either None or
           matches the full list of available species. Returns False when one
           or more of the available species are not in the instance's list.
        '''
        if self.species:
            for s in Species.available_species:
                if s not in self.species:
                    return False
        return True

    @property
    def usage_data(self):
        stats = {}
        stats['users'] = self.popularity.users_count
        stats['layouts'] = self.popularity.score
        return stats

    @property
    def usage(self):
        '''return the list of layouts using this plugin.'''
        return self.biogpsgenereportlayout_set.all()

    def usage_count(self, user):
        '''Return a tuple for (cnt_mylayouts, cnt_otherslayouts).'''
        used_layouts = self.biogpsgenereportlayout_set.all()
        cnt_total = used_layouts.count()
        if cnt_total > 0:
            cnt_mylayouts = (user.mylayouts.all() & used_layouts).count()
        else:
            cnt_mylayouts = 0
        return (cnt_mylayouts, cnt_total - cnt_mylayouts)

    def usage_users(self):
        '''Return number of unique users using plugin'''
        unique_users = list()
        layouts = self.biogpsgenereportlayout_set.all()
        for i in layouts:
            if i.author not in unique_users and \
               i.author.lower().find('demo') == -1:
                unique_users.append(i.author)

        return len(unique_users)

    def usage_percent(self):
        '''Return the percentage of total layouts that use this plugin.'''
        from biogps.apps.layout.models import BiogpsGenereportLayout
        stats = {
                 'layouts': self.biogpsgenereportlayout_set.count() * 100.0 /
                            BiogpsGenereportLayout.objects.count()
                }
        return stats

    def getKeywords(self, url=None):
        url = url or self.url
        if url:
            kwd_list = re.findall('(\{\{[\w|]+\}\})', url)
            return kwd_list
        else:
            return []

    def geturl(self, gene, mobile=False):
        '''rendering actual url given input gene
           gene is a object returned by DataService.GetGeneIdentifiers
           if mobile is true, using alt. mobile_url if provided.
        '''
        from biogps.apps.plugin.plugin import _plugin_geturl

        return _plugin_geturl(self, gene, mobile=mobile)

    def update_options(self, **kwargs):
        _options = self.options or {}
        _options.update(kwargs)
        if _options:
            self.options = _options
            self.save()

    def add_mobile_url(self, murl):
        '''Add optional "mobile_url" field in plugin.options to specify
           alternative url template for mobile page.
        '''
        self.update_options(mobile_url=murl)

    @property
    def allowedspecies(self):
        return self.species

    @property
    def mobile_url(self):
        return self.options['mobile_url'] if 'mobile_url' in self.options else None

    @property
    def certified_owner(self):
        return 'certified_owner' in self.options and self.options['certified_owner'] == True

    def flag_as_certified_owner(self):
        '''Add optional "certified_owner" flag to indicate this plugin's owner
           is certified.
        '''
        self.update_options(certified_owner=True)

from south.modelsinspector import add_introspection_rules
add_introspection_rules([
    (
        [BiogpsPlugin], # Class(es) these apply to
        [],         # Positional arguments (not used)
        {           # Keyword argument
            "slug": ["slug", {}],
        },
    ),
], ["^biogps\.apps\.plugin\.models\.BiogpsPlugin"])


def init_handler(sender, **kwargs):
    '''Handle post-initialization for model.
       Initialize species field when backwards compatibility is needed.
       Populates short_description with the beginning of description if not defined.
    '''
    instance = kwargs['instance']
    # Handle the species
    if instance.uses_all_species():
        # Additional check for backwards-compatibility
        if instance.options and 'allowedSpecies' in instance.options:
            instance.species = instance.options['allowedSpecies']

    # Handle the short_description
    if not instance.short_description:
        if instance.description:
            import textwrap
            max_length = 140
            if len(instance.description) > max_length:
                instance.short_description = textwrap.wrap(instance.description, max_length-3)[0] + '...'
            else:
                instance.short_description = instance.description
        else:
            instance.short_description = "No summary provided."

models.signals.post_init.connect(init_handler, BiogpsPlugin,
                                 dispatch_uid='BiogpsPlugin_init_handler')

def create_handler(sender, **kwargs):
    '''Handle post-creation for Plugin model.
       Creates a Popularity object for the given instance.
    '''
    if kwargs['created']:
        #create an entry on popularity table
        BiogpsPluginPopularity.objects.create(plugin=kwargs['instance'], score=0)

models.signals.post_save.connect(create_handler, BiogpsPlugin,
                                 dispatch_uid='BiogpsPlugin_create_handler')

try:
    tagging.register(BiogpsPlugin)
except tagging.AlreadyRegistered:
    pass


set_on_the_fly_indexing(BiogpsPlugin)


class BiogpsPluginPopularity(models.Model):
    plugin = models.OneToOneField(BiogpsPlugin, related_name='popularity')
    score = models.FloatField()
    rank = models.PositiveIntegerField(default=0)
    users_count = models.PositiveIntegerField(default=0)
    related_plugins = JSONField(blank=True, editable=False, default='[]')


