import base64
import tagging
import types
from biogps.apps.auth2.models import UserProfile
from biogps.utils.models import BioGPSModel
from biogps.utils.fields.jsonfield import JSONField
from django.db import models
from django_extensions.db.fields import AutoSlugField
from django.template.defaultfilters import slugify
from biogps.apps.plugin.fields import SpeciesField
from south.modelsinspector import add_introspection_rules


"""
Note:
    all datafile and colorfile need to be deposit to:
        /projects/BioGPS/load_archive/ds_inbound/
    filename cannot contain spaces
"""


class BiogpsDatasetManager(models.Manager):
    """Retrieve dataset via GEO or dataset ID"""
    def get(self, *args, **kwargs):
        if 'id' in kwargs and type(kwargs['id']) in types.StringTypes and\
            kwargs['id'][:3].upper() in ['GDS', 'GSE']:
            _id = kwargs['id']
            _id_prefix = _id[:3].upper()
            if _id_prefix == 'GDS':
                return super(BiogpsDatasetManager, self).get(geo_gds_id=_id)
            elif _id_prefix == 'GSE':
                return super(BiogpsDatasetManager, self).get(geo_gse_id=_id)
        else:
            # Non-id kwargs passed; business as usual
            try:
                return super(BiogpsDatasetManager, self).get(*args, **kwargs)
            except (AttributeError, BiogpsDataset.DoesNotExist, TypeError,
                    ValueError):
                # Invalid dataset ID
                return None


class BiogpsDataset(BioGPSModel):
    """Model definition for BiogpsDataset"""
    name = models.CharField(max_length=500)
    summary = models.CharField(blank=True, max_length=10000)
    ownerprofile = models.ForeignKey(UserProfile, to_field='sid')
    platform = models.ForeignKey('BiogpsDatasetPlatform',
        related_name='dataset_platform')
    geo_gds_id = models.CharField(max_length=100)
    geo_gse_id = models.CharField(max_length=100)
    geo_id_plat = models.CharField(max_length=100)
    metadata = JSONField(blank=False, editable=True)
    lastmodified = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    slug = AutoSlugField(populate_from='name')
    species = SpeciesField(max_length=1000)

    # Custom manager
    objects = BiogpsDatasetManager()

    # Required setting for ModelWithPermission and PermissionManager working
    object_type = 'D'

    # Short_name will be used as the index_type for ES indexing
    short_name = 'dataset'

    class Meta:
        permissions = (
            ("can_share_dataset", "Can share dataset with others."),
        )
        ordering = ("name",)
        get_latest_by = 'lastmodified'

    def __unicode__(self):
        return u'"%s" by "%s"' % (self.name, self.owner.get_valid_name())

    @models.permalink
    def get_absolute_url(self):
        """ Return the appropriate URL for this dataset. """
        return ('dataset_show', [str(self.id), slugify(self.name)])

    def object_cvt(self, mode='ajax'):
        """A helper function to convert a BiogpsDataset object to a simplified
            python dictionary, with all values in python's primary types only.
            Such a dictionary can be passed directly to fulltext indexer or
            serializer for ajax return.

          @param mode: can be one of ['ajax', 'es'], used to return slightly
                                        different dictionary for each purpose.
          @return: an python dictionary
        """
        extra_attrs = {None: ['geo_id_plat', 'metadata', 'name', 'platform',
            'species']}
        out = self._object_cvt(extra_attrs=extra_attrs, mode=mode)
        out['description'] = self.metadata['summary']
        return out

try:
    tagging.register(BiogpsDataset)
except tagging.AlreadyRegistered:
    pass

#set_on_the_fly_indexing(BiogpsDataset)

add_introspection_rules([
    (
        [BiogpsDataset],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {           # Keyword argument
            "slug": ["slug", {}],
            "species": ["species", {}],
        },
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDataset"])


class BiogpsDatasetData(models.Model):
    """Model definition for BiogpsDatasetData"""
    dataset = models.ForeignKey(BiogpsDataset, related_name='dataset_data')
    reporter = models.CharField(max_length=200)
    data = JSONField(blank=False, editable=True)

    def object_cvt(self, mode='ajax'):
        """A helper function to convert a BiogpsDatasetData object to a
            simplified python dictionary, with all values in python's primary
            types only. Such a dictionary can be passed directly to fulltext
            indexer or serializer for ajax return.

          @param mode: can be one of ['ajax', 'es'], used to return slightly
                                        different dictionary for each purpose.
          @return: an python dictionary
        """
        extra_attrs = {None: ['name', 'species', 'metadata']}
        out = self._object_cvt(extra_attrs=extra_attrs, mode=mode)
        return out

add_introspection_rules([
    (
        [BiogpsDatasetData],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {},         # Keyword argument
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDatasetData"])


class BiogpsDatasetReporters(models.Model):
    """Model definition for BiogpsDatasetReporters"""
    dataset = models.ForeignKey(BiogpsDataset,
        related_name='dataset_reporters')
    reporters = JSONField(blank=False, editable=True)

    def object_cvt(self, mode='ajax'):
        """A helper function to convert a BiogpsDatasetReporters object to a
           simplified python dictionary, with all values in python's primary
           types only. Such a dictionary can be passed directly to fulltext
           indexer or serializer for ajax return.

          @param mode: can be one of ['ajax', 'es'], used to return slightly
                                        different dictionary for each purpose.
          @return: an python dictionary
        """
        extra_attrs = {None: ['name', 'species', 'metadata']}
        out = self._object_cvt(extra_attrs=extra_attrs, mode=mode)
        return out

add_introspection_rules([
    (
        [BiogpsDatasetReporters],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {},         # Keyword argument
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDatasetReporters"])


class BiogpsDatasetMatrix(models.Model):
    """Model definition for BiogpsDatasetMatrix"""
    dataset = models.OneToOneField(BiogpsDataset,
        related_name='dataset_matrix')
    reporters = JSONField(blank=False, editable=True)
    _matrix = models.TextField(db_column='matrix')

    def get_data(self):
        return base64.decodestring(self._matrix)

    def set_data(self, matrix):
        self._matrix = base64.encodestring(matrix)

    matrix = property(get_data, set_data)

    def object_cvt(self, mode='ajax'):
        """A helper function to convert a BiogpsDatasetMatrix object to a
           simplified python dictionary, with all values in python's primary
           types only. Such a dictionary can be passed directly to fulltext
           indexer or serializer for ajax return.

          @param mode: can be one of ['ajax', 'es'], used to return slightly
                                        different dictionary for each purpose.
          @return: an python dictionary
        """
        extra_attrs = {None: ['name', 'description', 'short_description',
                              'type', 'species', 'options', 'metadata']}
        out = self._object_cvt(extra_attrs=extra_attrs, mode=mode)
        return out

add_introspection_rules([
    (
        [BiogpsDatasetMatrix],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {},         # Keyword argument
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDatasetMatrix"])


class BiogpsDatasetPlatform(models.Model):
    """Model definition for BiogpsDatasetPlatform"""
    platform = models.CharField(max_length=100)
    reporters = JSONField(blank=False, editable=True)

    def object_cvt(self, mode='ajax'):
        """A helper function to convert a BiogpsDatasetMatrix object to a
           simplified python dictionary, with all values in python's primary
           types only. Such a dictionary can be passed directly to fulltext
           indexer or serializer for ajax return.

          @param mode: can be one of ['ajax', 'es'], used to return slightly
                                        different dictionary for each purpose.
          @return: an python dictionary
        """
        extra_attrs = {None: ['name', 'description', 'short_description',
                              'type', 'species', 'options', 'metadata']}
        out = self._object_cvt(extra_attrs=extra_attrs, mode=mode)
        return out

add_introspection_rules([
    (
        [BiogpsDatasetPlatform],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {},         # Keyword argument
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDatasetPlatform"])


class BiogpsDatasetGeoLoaded(models.Model):
    """Model definition for BiogpsDatasetGeoLoaded. This model tracks what
       GEO datasets have been loaded."""
    geo_type = models.CharField(max_length=10)
    datasets = JSONField(blank=False, editable=True)

add_introspection_rules([
    (
        [BiogpsDatasetGeoLoaded],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {},         # Keyword argument
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDatasetGeoLoaded"])


class BiogpsDatasetGeoFlagged(models.Model):
    """Model definition for BiogpsDatasetGeoFlagged. This model tracks what
       GEO datasets have been flagged, and the reason why."""
    geo_type = models.CharField(max_length=10)
    dataset = models.ForeignKey(BiogpsDataset, related_name='dataset_flagged')
    reason = models.CharField(max_length=1000)

add_introspection_rules([
    (
        [BiogpsDatasetGeoFlagged],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {},         # Keyword argument
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDatasetGeoFlagged"])


class BiogpsDatasetProcessing(models.Model):
    """Model definition for BiogpsDatasetProcessing. This model tracks what
       datasets are currently being loaded, to allow for multi-threaded
       processing."""
    datasets = JSONField(blank=False, editable=True)

add_introspection_rules([
    (
        [BiogpsDatasetProcessing],  # Class(es) these apply to
        [],         # Positional arguments (not used)
        {},         # Keyword argument
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDatasetProcessing"])
