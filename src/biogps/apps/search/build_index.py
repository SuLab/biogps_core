#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
TODO:
       score-tuning:   1. Symbol
                    2. any ID
                    3. name
                    4. summary
                    5. other text (uniprot name, interpro desc, go term)

       case to consider:
                q=hypoxia inducible factor
                 if matching from the beginning, rank higher?
           appear first     # name: "hypoxia-inducible factor 1, alpha subunit (basic helix-loop-helix transcription factor)"
           appear latter    # name: "similar to egl nine homolog 1 (hypoxia-inducible factor prolyl hydroxylase 2) (hif-prolyl hydroxylase 2) (hif-ph2) (hph-2) (sm-20)"



    auto-correction:  1. multiple terms use default AND first, if no hit, do the OR automatically (with a note on UI)
'''
from functools import partial
from django.conf import settings
from django.db.models.signals import post_save, post_delete

from pyes import ES
from pyes.exceptions import (NotFoundException, IndexMissingException,
                             ElasticSearchException)

from biogps.utils import ask
from es_lib import get_es_conn

import logging
log = logging.getLogger('pyes')
if settings.DEBUG:
    log.setLevel(logging.DEBUG)
    if len(log.handlers) == 0:
        log_handler = logging.StreamHandler()
        log.addHandler(log_handler)

##Leave this settings in this file in case that we want to index on a different
## server from the one specified in settings_*.py
ES_HOST = settings.ES_HOST
_conn = get_es_conn(ES_HOST)

def check():
    '''Just print out current server settings for verification.'''
    print "ES_HOST:", _conn.servers
    print "DATABASE:", settings.DATABASES['default']['NAME']

class BiogpsESIndexerBase(object):
    ES_HOST = ES_HOST
    ES_INDEX_NAME = settings.ES_INDEX_NAME

    def __init__(self):
#        self.conn = ES(self.ES_HOST, default_indexes=[self.ES_INDEX_NAME])
        self.conn = _conn
        self.step = 10000

    def create_index(self):
        try:
            print self.conn.open_index(self.ES_INDEX_NAME)
        #except NotFoundException:
        except IndexMissingException:
            print self.conn.create_index(self.ES_INDEX_NAME)

    def delete_index_type(self, index_type):
        '''Delete all indexes for a given index_type.'''
        index_name = self.ES_INDEX_NAME
        #Check if index_type exists
        mapping = self.conn.get_mapping(index_type, index_name)
        if index_name not in mapping or index_type not in mapping[index_name]:
            print 'Error: index type "%s" does not exist in index "%s".' % (index_type, index_name)
            return
        path = '/%s/%s' % (index_name, index_type)
        if ask('Confirm to delete all data under "%s":' % path) == 'Y':
            return self.conn.delete_mapping(index_name, index_type)

    def index(self, doc, index_type, id=None):
        '''add a doc to the index. If id is not None, the existing doc will be
           updated.
        '''
        return self.conn.index(doc, self.ES_INDEX_NAME, index_type, id=id)

    def delete_index(self, index_type, id):
        '''delete a doc from the index based on passed id.'''
        return self.conn.delete(self.ES_INDEX_NAME, index_type, id)

    def optimize(self):
        return self.conn.optimize(self.ES_INDEX_NAME, wait_for_merge=True)


class BiogpsGeneESIndexer(BiogpsESIndexerBase):
    GeneDoc_DB_URL = 'http://cwu-dev.lj.gnf.org:5984'
    GeneDoc_DB_NAME = 'genedoc'
    ES_INDEX_TYPE = 'gene'

    def build_index(self, update_mapping=False, bulk=True, step=10000):
        from build_index_gene_utils import (get_db, doc_feeder,
                                            genedoc_cvt2, make_field_mapping)

        db = get_db(self.GeneDoc_DB_URL, self.GeneDoc_DB_NAME)
        conn = self.conn
        index_name = self.ES_INDEX_NAME
        index_type = self.ES_INDEX_TYPE

        #Test if index exists
        try:
            print conn.open_index(index_name)
        except NotFoundException:
            print 'Error: index "%s" does not exist. Create it first.' % index_name
            return -1

        if update_mapping:
            genedoc_mapping = make_field_mapping(db)
            print conn.put_mapping(index_type,
                                   {'properties': genedoc_mapping},
                                   [index_name])

        for docs in doc_feeder(db, step=step, inbatch=True):
            try:
#                docs = [genedoc_cvt(doc.doc) for doc in docs if not doc.id.startswith('_')]
                docs = [genedoc_cvt2(doc.doc, db) for doc in docs if not doc.id.startswith('_')]
            except TypeError:
                print doc.id
                raise
            for doc in docs:
                conn.index(doc, index_name, index_type, doc['id'], bulk=bulk)
            if bulk:
                conn.force_bulk()
            print conn.refresh([index_name]),


class BiogpsModelESIndexer(BiogpsESIndexerBase):
    '''The base class for indexing objects from BioGPSModel derived models,
       e.g., BioGPSPlugin, BiogpsGenereportLayout, etc.
    '''
    _model = None           # need to specify in each subclass
    ES_INDEX_TYPE = None    # need to specify in each subclass

    def _get_field_mapping(self, extra_attrs={}):
        #field mapping templates
        #t0 is for store-only field
        t0 = {'store': "yes",
             'index': 'no',
             'type': 'string'}
        #t1 is for general IDs
        t1 = {'store': "yes",
             'index': 'not_analyzed',
             'type': 'string',
             'term_vector': 'with_positions_offsets'}
        #t2 is for free text
        t2 = {'store': "yes",
             'index': 'analyzed',
             'type': 'string',
             'term_vector': 'with_positions_offsets'}
        #t3 is for date
        t3 = {'store': "yes",
             'index': 'not_analyzed',
             'type': 'date',
             'format': 'YYYY-MM-dd HH:mm:ss'}
        t_float = {'type': 'float'}
        t_disabled_object = {'type': 'object',
                             'enable': False}
        t_disabled_string = {'type': 'string',
                             'index': 'no'}
        t_disabled_double = {'type': 'double',
                             'index': 'no'}

        td = {0: t0,
              1: t1,
              2: t2,
              3: t3,
              'float': t_float,
              'disabled_object': t_disabled_object,
              'disabled_string': t_disabled_string,
              'disabled_double': t_disabled_double}

        properties = {'in': t1,
                      'id': t1,
                      'created': t3,
                      'lastmodified': t3,
                      'role_permission': t1,
                      'tags': t1}

        for t_id in td.keys():
            for attr in extra_attrs.pop(t_id, []):
                properties[attr] = td[t_id]
        properties.update(extra_attrs)

        for f in properties:
            properties[f] = properties[f].copy()

        #some special settings
        #for tag field
        properties['tags']['index_name'] = 'tag'

        #for name field
        properties['name'] = {
             "type" : "multi_field",
             "store": "yes",
             "fields" : {
                "name" : {
                          'index': 'analyzed',
                          'type': 'string',
                          'boost': 2.0,
                          'term_vector': 'with_positions_offsets'
                         },
                "for_sort" : {
                              "type" : "string",
                              "index" : "not_analyzed"
                             }
              }
        }
        #for owner field
        properties['owner'] = {
            "store": "yes",
            "type": "object",
            "path": 'just_name',  #! This is important to make query "username:cwudemo" work, instead of using "owner.username:cwudemo"
            "properties" : {
                "username" : {
                              "type" : "string",
                              "index_name": "username",
                              "index": "not_analyzed",
                             },
                "name" : {
                           "type" : "string",
                          "index_name": "owner",
                          "index": "analyzed",
                         },
                "url" : {
                          "type" : "string",
                          "index": "no",
                         }
            }
        }

        #for rating_data field
        properties['rating_data'] = {
            "store": "yes",
            "type": "object",
            "properties": {
                "avg_stars": {"type": "short"},
                "total": {"type": "short"},
                "avg": {"type": "short"},
            }
        }

        mapping = {'properties': properties}
        #enable _source compression
        mapping["_source"] = {"enabled" : True,
                              "compress": True,
                              "compression_threshold": "1kb"}

#        #store "_all" for highlighting.
#        mapping["_all"] = {"store": "yes",
#                           "type": "string",
#                           "term_vector": "with_positions_offsets"}
        return mapping

    def get_field_mapping(self):
        raise NotImplementedError

    def build_index(self, update_mapping=False, bulk=True):
        pli = self._model.objects.all()
        conn = self.conn
        index_name = self.ES_INDEX_NAME
        index_type = self.ES_INDEX_TYPE

        #Test if index exists
        try:
            print "Opening index...", conn.open_index(index_name)
        except NotFoundException:
            print 'Error: index "%s" does not exist. Create it first.' % index_name
            return -1

        try:
            cur_mapping = conn.get_mapping(index_type, index_name)
            empty_mapping = False
        except ElasticSearchException:
            #if no existing mapping available for index_type
            #force update_mapping to True
            empty_mapping = True
            update_mapping = True

#        empty_mapping = not cur_mapping[index_name].get(index_type, {})
#        if empty_mapping:
#            #if no existing mapping available for index_type
#            #force update_mapping to True
#            update_mapping = True

        if update_mapping:
            print "Updating mapping...",
            if not empty_mapping:
                print "\n\tRemoving existing mapping...",
                print conn.delete_mapping(index_name, index_type)
            _mapping = self.get_field_mapping()
            print conn.put_mapping(index_type,
                                   _mapping,
                                   [index_name])
        print "Building index..."
        for p in pli:
            doc = p.object_cvt(mode='es')
            conn.index(doc, index_name, index_type, doc['id'], bulk=bulk)
#            if bulk:
#                conn.force_bulk()
        print conn.flush()
        print conn.refresh()


class BiogpsPluginESIndexer(BiogpsModelESIndexer):
    '''A class for indexing all BiogpsPlugin objects.'''
    def __init__(self):
        from biogps.apps.plugin.models import BiogpsPlugin
        self._model = BiogpsPlugin
        self.ES_INDEX_TYPE = self._model.short_name
        super(BiogpsModelESIndexer, self).__init__()

    def get_field_mapping(self):
        m_usage_data = {
            "store": "yes",
            "type": "object",
            "properties": {
                "users": {"type": "short"},
                "layouts": {"type": "short"},
            }
        }
        m = self._get_field_mapping(extra_attrs={1: ['type', 'species'],
                                                 2: ['name', 'description', 'short_description', 'url'],
                                                 "float": ['popularity'],
                                                 'disabled_object': ['options'],
                                                 'disabled_string': ['shortUrl', 'permission_style'],
                                                 'usage_data': m_usage_data
                                                 })
        return m


class BiogpsLayoutESIndexer(BiogpsModelESIndexer):
    '''A class for indexing all BiogpsGenereportLayout objects.'''
    def __init__(self):
        from biogps.apps.layout.models import BiogpsGenereportLayout
        self._model = BiogpsGenereportLayout
        self.ES_INDEX_TYPE = self._model.short_name
        super(BiogpsModelESIndexer, self).__init__()

    def get_field_mapping(self):
        m = self._get_field_mapping(extra_attrs={2: ['name', 'description'],
                                                 'disabled_string': ['permission_style'],
                                                 })
        #some special settings
#        m['name']['boost'] = 2.0
        return m


class BiogpsGenelistESIndexer(BiogpsModelESIndexer):
    '''A class for indexing all BiogpsGeneList objects.'''
    def __init__(self):
        from biogps.apps.genelist.models import BiogpsGeneList
        self._model = BiogpsGeneList
        self.ES_INDEX_TYPE = self._model.short_name
        super(BiogpsModelESIndexer, self).__init__()

    def get_field_mapping(self):
        m = self._get_field_mapping(extra_attrs={2: ['name', 'description'],
                                                 'disabled_string': ['permission_style'],
                                                 })
        #some special settings
#        m['name']['boost'] = 2.0
        return m

class BiogpsDatasetESIndexer(BiogpsModelESIndexer):
    '''A class for indexing all BiogpsGeneList objects.'''
    def __init__(self):
        from biogps.apps.dataset.models import BiogpsDataset
        self._model = BiogpsDataset
        self.ES_INDEX_TYPE = self._model.short_name
        super(BiogpsModelESIndexer, self).__init__()

    def get_field_mapping(self):
        m = self._get_field_mapping(extra_attrs={1: ['platform', 'species', 'type'],
                                                 2: ['name', 'description'],
                                                 'disabled_string': ['permission_style'],
                                                 'disabled_object': ['options', 'metadata'],
                                                 })
        return m


def _rebuild_x(delete_old=False, update_mapping=False, indexer=None):
    '''A convenient function for re-building indexes.
    '''
    es_indexer = indexer()
    if delete_old:
        es_indexer.delete_index_type(es_indexer.ES_INDEX_TYPE)
        update_mapping = True   # if delete_old is True, update_mapping should be True anyway
    es_indexer.build_index(update_mapping=update_mapping, bulk=True)

rebuild_gene = partial(_rebuild_x, indexer=BiogpsGeneESIndexer)
rebuild_gene.__doc__ = 'A convenient function for re-building all genes from CouchDB.'
rebuild_plugin = partial(_rebuild_x, indexer=BiogpsPluginESIndexer)
rebuild_plugin.__doc__ = 'A convenient function for re-building all plugins.'
rebuild_layout = partial(_rebuild_x, indexer=BiogpsLayoutESIndexer)
rebuild_layout.__doc__ = 'A convenient function for re-building all layouts.'
rebuild_genelist = partial(_rebuild_x, indexer=BiogpsGenelistESIndexer)
rebuild_genelist.__doc__ = 'A convenient function for re-building all genelists.'


def rebuild_all(delete_old=False):
    '''A convenient function for re-building all biogpsmodel objects,
       not including genes.
    '''
    rebuild_plugin(delete_old)
    rebuild_layout(delete_old)
    rebuild_genelist(delete_old)


def on_the_fly_es_update_handler(sender, **kwargs):
    '''A post_save signal handler to update ES indexes whenever a BiogpsModel object
       is created/updated.

       To connect to a signal:
           post_save.connect(on_the_fly_es_update_handler, sender=BioGPSModel,
                             dispatch_uid="some_unique_id")

    '''
    if not getattr(settings, "SUSPEND_ES_UPDATE", None):
        object = kwargs['instance']
        es_indexer = BiogpsModelESIndexer()
        doc = object.object_cvt(mode='es')
        res = es_indexer.index(doc, object.short_name, object.id)
        return True


def on_the_fly_es_delete_handler(sender, **kwargs):
    '''A post_delete signal handler to delete ES indexes whenever a BiogpsModel object
       is deleted.

       To connect to a signal:
           post_delete.connect(on_the_fly_es_delete_handler, sender=BioGPSModel,
                               dispatch_uid="some_unique_id")

    '''
    if not getattr(settings, "SUSPEND_ES_UPDATE", None):
        object = kwargs['instance']
        es_indexer = BiogpsModelESIndexer()
        res = es_indexer.delete_index(object.short_name, object.id)
        return True


def set_on_the_fly_indexing(biogpsmodel):
    '''set input biogpsmodel for on the fly indexing:
          * add to index when a new object is created
          * update index when an object is updated
          * delete from index when an object is deleted
    '''
    post_save.connect(on_the_fly_es_update_handler, sender=biogpsmodel,
                      dispatch_uid=biogpsmodel.__name__ + 'update_indexer')
    post_delete.connect(on_the_fly_es_delete_handler, sender=biogpsmodel,
                      dispatch_uid=biogpsmodel.__name__ + 'delete_indexer')
