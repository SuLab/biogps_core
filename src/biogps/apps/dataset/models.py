import base64
import os
import sys
import tagging
from biogps.apps.auth2.models import UserProfile
from biogps.apps.boc.boc_svc import callRemoteService
from biogps.apps.search.build_index import set_on_the_fly_indexing
from biogps.utils.models import BioGPSModel
from biogps.utils.fields.jsonfield import JSONField
from django.conf import settings
from django.db import models
#from biogps.utils.fields import AutoSlugField
from django_extensions.db.fields import AutoSlugField
from django.template.defaultfilters import slugify
from biogps.utils.models import Species


'''
Note:
    all datafile and colorfile need to be deposit to:
        /projects/BioGPS/load_archive/ds_inbound/
    filename cannot contain spaces
'''


class BiogpsDataset(BioGPSModel):
    '''Model definition for BiogpsDataset.'''
    name = models.CharField(max_length=200)
    ownerprofile = models.ForeignKey(UserProfile, to_field='sid',
                                                  db_column='authorid')
    author = models.CharField(max_length=100)
    platform = models.CharField(max_length=100)
    type = models.CharField(max_length=200)
    taxid = models.PositiveIntegerField()
    samples = JSONField(blank=True, editable=False)
    metadata = JSONField(blank=True, editable=False)
    options = JSONField(blank=True, editable=False)
    description = models.TextField(blank=True)
    short_description = models.CharField(blank=True, max_length=140)
    lastmodified = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    slug = AutoSlugField(populate_from='name')

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
        return u'"%s" by "%s"' % (self.name, self.author)

    @models.permalink
    def get_absolute_url(self):
        """ Returns the appropriate URL for this dataset. """
        return ('dataset_show', [str(self.id), slugify(self.name)])

    def object_cvt(self, mode='ajax'):
        '''A helper function to convert a BiogpsDataset object to a simplified
            python dictionary, with all values in python's primary types only.
            Such a dictionary can be passed directly to fulltext indexer or
            serializer for ajax return.

          @param mode: can be one of ['ajax', 'es'], used to return slightly
                                        different dictionary for each purpose.
          @return: an python dictionary
        '''
        extra_attrs = {None: ['name', 'description', 'short_description',
                              'type', 'species', 'options', 'metadata']}
        out = self._object_cvt(extra_attrs=extra_attrs, mode=mode)
        return out

    @property
    def species(self):
        return Species[self.taxid].name

try:
    tagging.register(BiogpsDataset)
except tagging.AlreadyRegistered:
    pass

set_on_the_fly_indexing(BiogpsDataset)

from south.modelsinspector import add_introspection_rules
add_introspection_rules([
    (
        [BiogpsDataset], # Class(es) these apply to
        [],         # Positional arguments (not used)
        {           # Keyword argument
            "slug": ["slug", {}],
        },
    ),
], ["^biogps\.apps\.dataset\.models\.BiogpsDataset"])


class SL_Dataset:
    DATASET_URL = 'http://apps-dev.biogps.gnf.org/dataset'
    #DATASET_URL = 'http://apps.biogps.gnf.org/dataset'

    def __init__(self, datasetid=None):
        self.datasetid = datasetid

    def create(self, name, datafile, description=None, colorfile=None):
        ''' datafile and colorfile should be just file name only.'''
        param = dict(name=name, datafile=datafile)
        if description:
            param['description'] = description
        if colorfile:
            param['colorfile'] = colorfile
        headers = {'accept': 'application/json',
                 'content-type': 'text/plain'}
        credentials = ('cwu@lj.gnf.org', settings.SL_PIN)
        headers['authorization'] = 'Basic ' + base64.b64encode("%s:%s"
                                                      % credentials).strip()
        return callRemoteService(self.DATASET_URL,
                                 param=param,
                                 method='POST',
                                 credentials=credentials,
                                 headers=headers,
                                 returnmode='both',
                                 httpdebuglevel=1)

    def add_role(self, role):
        dataset_id = self.datasetid
        if not dataset_id:
            print "Need to specify a datasetid."
            return

        if role in ['Anonymous']:
            url = self.DATASET_URL + '/%s/roles/%s?r=1&w=0&f=0' % (dataset_id,
                                                                         role)
            param = dict(r=1, w=0, f=0)
            headers = {'accept': 'application/json',
                     'content-type': 'text/plain',
                     'Content-Length': '0'}
            param = {}
            credentials = ('cwu@lj.gnf.org', settings.SL_PIN)
            headers['authorization'] = 'Basic ' + base64.b64encode("%s:%s"
                                                      % credentials).strip()
            return callRemoteService(url,
                                     param=param,
                                     method='PUT',
                                     credentials=credentials,
                                     headers=headers,
                                     returnmode='both',
                                     httpdebuglevel=1)
        else:
            print 'Unknown role specified'
            print 'Valid roles are: Anonymous'

    def delete(self):
        if not self.datasetid:
            print "Need to specify a datasetid."
            return

        s = raw_input('Confirm to delete dataset "%s"? Type "yes" to '\
                                               'continue: ' % self.datasetid)
        if s != 'yes':
            print "Abort!"
            return
        s = raw_input('Confirm again, type "yes" to continue: ')
        if s != 'yes':
            print "Abort!"
            return

        url = self.DATASET_URL + '/%s' % self.datasetid
        credentials = ('cwu@lj.gnf.org', settings.SL_PIN)
        #credentials = ('corozco@lj.gnf.org', settings.SL_PIN)
        headers = {}
        headers['authorization'] = 'Basic ' + base64.b64encode("%s:%s"
                                                        % credentials).strip()
        return callRemoteService(url,
                                 method='DELETE',
                                 credentials=credentials,
                                 headers=headers,
                                 httpdebuglevel=1)

    def update(self, name, datafile, description=None, colorfile=None):
        if not self.datasetid:
            print "Need to specify a datasetid."
            return

        #url = self.DATASET_URL+'/%s' % self.datasetid
        url = self.DATASET_URL     # URL should be the one above ideally
        credentials = ('cwu@lj.gnf.org', settings.SL_PIN)
        headers = {}
        headers['authorization'] = 'Basic ' + base64.b64encode("%s:%s"
                                                        % credentials).strip()
        param = dict(id=self.datasetid, name=name, datafile=datafile)
        if description:
            param['description'] = description
        if colorfile:
            param['colorfile'] = colorfile
        return callRemoteService(url,
                                 param=param,
                                 method='PUT',
                                 credentials=credentials,
                                 headers=headers,
                                 httpdebuglevel=1)
