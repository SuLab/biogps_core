from apps.search.build_index import BiogpsESIndexerBase, ElasticSearchException
from ast import literal_eval
from biogps.apps.dataset.models import BiogpsDataset, BiogpsDatasetReporters, BiogpsDatasetPlatform
from django.conf import settings
from pyes import ES
from pyes.exceptions import (NotFoundException, IndexMissingException,
                             ElasticSearchException)

settings.ES_AVAILABLE_TYPES['dataset_platform'] = {'facets': [], 'sort': '_id'}


def datafile_iterator(datafile):
    '''Parses data file, yields ES doc for each line'''
    with file(datafile) as f:
        cnt = 0
        in_datasets = False
        for line in f:
            #print 'Line: {}'.format(cnt)
            if line.startswith('\.'):
                in_datasets = False
                break
            elif line.startswith('COPY'):
                in_datasets = True
                continue
            elif in_datasets:
                s_line = line.rstrip().replace('\\"', "'").split('\t')
                metadata = literal_eval(s_line[5])
                pubmed_id = int(metadata['pubmed_id']) if metadata['pubmed_id'] else ''
                doc = {'id': int(s_line[0]),
                       'name': s_line[1],
                       'owner': metadata['owner'].lower(),
                       'platform_id': int(s_line[3]),
                       'geo_id_plat': s_line[4],
                       'geo_gds_id': metadata['geo_gds_id'],
                       'geo_gse_id': metadata['geo_gse_id'],
                       'geo_gpl_id': metadata['geo_gpl_id'],
                       'lastmodified': s_line[6],
                       'created': s_line[7],
                       'slug': s_line[8],
                       'species': s_line[9],
                       #'factors': metadata['factors'],
                       'display_params': metadata['display_params'],
                       'summary': s_line[10],
                       'pubmed_id': pubmed_id
                      }
                yield doc
            cnt += 1
    print 'Parsed {} lines...'.format(cnt)


def queryset_iterator(ds_model, batch_size=100):
    '''Performs batch query against DB for specified model, yields iterator'''
    start = 0
    total_cnt = ds_model.objects.count()
    print "Iterating %d rows..." % total_cnt
    for start in range(start, total_cnt, batch_size):
        end = min(start+batch_size, total_cnt)
        for row in ds_model.objects.order_by('pk')[start:end]:
            yield row


class BiogpsDatasetPlatformESIndexer(BiogpsESIndexerBase):
    ES_INDEX_NAME = 'biogps'
    ES_INDEX_TYPE = 'dataset_platform'
    _model = BiogpsDatasetPlatform

    def get_field_mapping(self):
        properties = {
            'id': {'store':"yes",
                   'index':'no',
                   'type': 'integer'},
            'platform': {'store':"yes",
                         'type': 'string',
                         'index': 'not_analyzed'},
            'reporters': {'store': "no",
                          "type" : "string",
                          "index_name" : "reporter",
                          'index': 'not_analyzed'}
        }
            
        mapping = {'properties': properties}
        return mapping

    def build_index(self, update_mapping=False, bulk=False):        
        pltfm_li = self._model.objects.all()
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
        for pltfm in pltfm_li:
            doc = {'id': pltfm.id,
                   'platform': pltfm.platform,
                   'reporters': pltfm.reporters}
            conn.index(doc, index_name, index_type, doc['id'], bulk=bulk)
        print conn.flush()
        print conn.refresh()


class BiogpsDatasetIndexer(BiogpsESIndexerBase):
    ES_INDEX_NAME = 'biogps_dataset'
    ES_INDEX_TYPE = 'dataset'
    conn = ES(settings.ES_HOST, default_indices=[ES_INDEX_NAME], timeout=10.0)

    def get_field_mapping(self):
        properties = {
            'created': {'store':"no",
                   'type': 'date',
                   #'format': 'date_optional_time', http://packages.python.org/pyes/guide/reference/mapping/date-format.html
                   #'format': 'yyyy-MM-dd HH:mm:ss.SSSSSSZZ'},
                   'format': 'yyyy-MM-dd HH:mm:ss.SSSSSS'
                   },
            'id': {'store':"no",
                   'type': 'integer'},
            'default': {'store':"no",
                   'type': 'boolean'},
            'display_params': {'store':"no",
                   'index':'no',
                   'include_in_all': False,
                   'type': 'string'},
            'factors': {'store':"no",
                   'index':'no',
                   'include_in_all': False,
                   'type': 'string'},
            'geo_gds_id': {'store':"no",
                   'type': 'string'},
            'geo_gpl_id': {'store': "no",
                          'type' : 'string'},
            'geo_gse_id': {'store':"no",
                   'type': 'string'},
            'geo_id_plat': {'store':"no",
                   'index':'no',
                   'include_in_all': False,
                   'type': 'string'},
            'lastmodified': {'store':"no",
                   'type': 'date',
                   #'format': 'yyyy-MM-dd HH:mm:ss.SSSSSSZZ'},
                   'format': 'yyyy-MM-dd HH:mm:ss.SSSSSS'
                   },
            'name': {'store':"no",
                   'type': 'string'},
            'owner': {'store':"no",
                   'index':'no',
                   'include_in_all': False,
                   'type': 'string'},
            'platform_id': {'store':"no",
                   'index':'no',
                   'include_in_all': False,
                   'type': 'integer'},
            'pubmed_id': {'store':"no",
                   'index':'no',
                   'include_in_all': False,
                   'type': 'integer'},
            'slug': {'store':"no",
                   'index':'no',
                   'include_in_all': False,
                   'type': 'string'},
            'species': {'store':"no",
                   'type': 'string'},
            'summary': {'store':"no",
                   'type': 'string'}
        }

        mapping = {'properties': properties}
        return mapping

    def build_index(self, iterator_type='queryset', datafile=None, update_mapping=False, bulk=False): 
        conn = self.conn
        index_name = self.ES_INDEX_NAME
        index_type = self.ES_INDEX_TYPE
        update_mapping = True

        #Test if index exists
        try:
            print "Opening index...", conn.open_index(index_name)
        except IndexMissingException:
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
        results = 0
        if iterator_type == 'queryset':
            for ds in queryset_iterator(BiogpsDataset):
                results += 1
                doc = {'id': ds.id,
                       #'created': str(ds.created),
                       'created': str(ds.created).strip(' '),
                       'default': ds.metadata['default'],
                       'display_params': ds.metadata['display_params'],
                       'factors': ds.metadata['factors'],
                       'geo_id_plat': ds.geo_id_plat,
                       'geo_gds_id': ds.metadata['geo_gds_id'],
                       'geo_gse_id': ds.metadata['geo_gse_id'],
                       'geo_gpl_id': ds.metadata['geo_gpl_id'],
                       'lastmodified': str(ds.lastmodified),
                       'name': ds.name,
                       'owner': ds.owner.get_valid_name(),
                       #'platform_id': ds.platform.platform,
                       'platform_id': ds.platform_id,
                       'pubmed_id': ds.metadata['pubmed_id'],
                       'slug': ds.slug,
                       'species': ds.species,
                       'summary': ds.metadata['summary']
                      }
                conn.index(doc, index_name, index_type, doc['id'], bulk=bulk)
        elif iterator_type == 'datafile':
            if not datafile:
                print 'No datafile specified! Exiting...'
                return
            for doc in datafile_iterator(datafile):
                results += 1
                conn.index(doc, index_name, index_type, doc['id'], bulk=bulk)
        print 'Done! - {} results'.format(results)
        print conn.flush()
        print conn.refresh()


class BiogpsDatasetReporterIndexer(BiogpsESIndexerBase):
    ES_INDEX_NAME = 'biogps_dataset'
    ES_INDEX_TYPE = 'by_reporter'
    conn = ES(settings.ES_HOST, default_indices=[ES_INDEX_NAME], timeout=10.0)

    def get_field_mapping(self):
        '''Example data looks like:
                {'id': 1,
                 'dataset_id': 15,
                 'reporter': '100_s_at',
                 'data': [1.0, 1.2, 1.4, 1.6]
                }
        '''
        properties = {
            'id': {'index': 'no',
                   'include_in_all': False,
                   'type': 'integer'},
            'reporter': {'store': 'no',
                         'include_in_all': False,
                         'type' : 'string',
                         'index': 'not_analyzed'}
        }

        #mapping = {'_parent': {'type': 'dataset'}, '_routing': {'required': True, 'path': 'id'}, 'properties': properties}
        #mapping = {'_parent': {'type': 'dataset'}, '_routing': {'required': True}, 'properties': properties}
        mapping = {'_parent': {'type': 'dataset'}, 'properties': properties}
        return mapping

    def build_index(self, update_mapping=False, bulk=False): 
        index_name = self.ES_INDEX_NAME
        index_type = self.ES_INDEX_TYPE
        conn = self.conn
        update_mapping = True

        #Test if index exists
        try:
            print "Opening index...", conn.open_index(index_name)
        except IndexMissingException:
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

        if update_mapping:
            print "Updating mapping...",
            if not empty_mapping:
                print "\n\tRemoving existing mapping...",
                print conn.delete_mapping(index_name, index_type)
            _mapping = self.get_field_mapping()
            print conn.put_mapping(index_type,
                                   _mapping,
                                   [index_name])

        print "Loading data...",
        # Data file version
        #datafile = '/sulab/cwu/prj/biogps/dataset_dump/dataset_reporter_xd.pyobj'
        #datafile = file(datafile)
        #import cPickle
        #ds_data = cPickle.load(datafile)
        #datafile.close()

        #print "Building index..."
        #incr = 0
        #for ds_id, reporter_li in ds_data.items():
        #    incr += 1
        #    doc = {'id': ds_id,
        #           'reporter': reporter_li}
        #    #print '{}\n'.format(doc)
        #    #conn.index(doc, index_name, index_type, doc['id'], bulk=bulk)
        #    conn.index(doc, index_name, index_type, doc['id'], parent=str(ds_id), bulk=bulk)

        # DB version
        for i in BiogpsDatasetReporters.objects.iterator():
            print i.dataset_id
            ds_id = i.dataset_id
            doc = {'id': ds_id, 'reporter': i.reporters}
            conn.index(doc, index_name, index_type, ds_id, parent=str(ds_id), bulk=bulk)
        print conn.flush()
        print conn.refresh()
        print 'Done!'


def test():
    from apps.search.es_lib import ESQuery
    es = ESQuery()
    es.ES_INDEX_NAME = 'biogps_dstest'
    return es

'''
curl -XGET 'http://184.72.42.242:9200/biogps_dstest/dataset_platform/_search?fields=id,platform' -d '
{"query": {"terms": {"reporter": ["1555682_at", "219369_s_at", "222878_s_at", "206646_at", "1555520_at", "208522_s_at", "209815_at", "209816_at"]}}}'    
'''

'''
curl -XGET 'http://184.72.42.242:9200/biogps_dstest/dataset_platform/_search?fields=id,platform&pretty=true' -d '
{"query" : {
    "filtered" : {
        "query" : {
             "match_all" : { }
        },
        "filter" : {
            "or" : [
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "1555682_at" }
                        },
                        "_name" : "1555682_at"
                    }
                },
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "219369_s_at" }
                        },
                        "_name" : "219369_s_at"
                    }
                },
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "222878_s_at" }
                        },
                        "_name" : "222878_s_at"
                    }
                },
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "206646_at" }
                        },
                        "_name" : "206646_at"
                    }
                },
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "1555520_at" }
                        },
                        "_name" : "1555520_at"
                    }
                },
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "208522_s_at" }
                        },
                        "_name" : "208522_s_at"
                    }
                },
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "209815_at" }
                        },
                        "_name" : "209815_at"
                    }
                },
                {
                    "fquery" : {
                        "query" : {
                            "term" : { "reporter" : "209816_at" }
                        },
                        "_name" : "209816_at"
                    }
                }
            ]
        }
   }
}
}
'
'''
