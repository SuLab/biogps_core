from biogps.search.es_lib import get_es_conn
from biogps.boe.views import MyGeneInfo
from biogps.utils.helper import alwayslist

from django.core.paginator import (
    Paginator,
    EmptyPage,
    PageNotAnInteger
    )
from django.conf import settings

from pyes import (
    ANDFilter,
    FilteredQuery,
    HasChildQuery,
    QueryFilter,
    StringQuery,
    TermFilter,
    TermsQuery
    )
from pyes.exceptions import ElasticSearchException
import types
import requests


def sanitize(ds_id):
    """Return sanitized (uppercase if applicable) dataset ID"""
    return ds_id.upper() if type(ds_id) in types.StringTypes else ds_id


class DatasetQuery():
    """Generic class container for dataset query functions"""

    conn = get_es_conn(default_idx='biogps_dataset')

    @staticmethod
    def get_ds(ds_id):
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/'+ds_id+'/4-biogps/')
        if res.json()['code'] != 0:
            raise None

        ds = res.json()['details']
        owner_map = {
            'Andrew Su': '/profile/3/asu',
            'Tom Freeman': '/profile/309/tfreeman',
            'ArrayExpress Uploader': '/profile/8773/arrayexpressuploader'
        }
        try:
            ds['owner_profile'] = owner_map[ds['owner']]
        except:
            ds['owner_profile'] = None
        return ds

    @staticmethod
    def get_default_ds(geneid):
        """Return default dataset for the given gene"""
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/default?gene=%s' % geneid)
        if res.json()['code'] != 0:
            return None
        ds = res.json()['details']
        return ds

    @staticmethod
    def get_default_ds0(rep_li, q_term=None):
        """Deprecated!!!
           Return default datasets"""
        _conn = DatasetQuery.conn
        kwargs = {'doc_types': 'dataset', 'indices': 'biogps_dataset',
            'fields': 'id,name,factors'}
        t_query = TermsQuery('reporter', rep_li.strip(' ').split(','))
        base_query = HasChildQuery(type='by_reporter', query=t_query)
        f_query = FilteredQuery(base_query, ANDFilter(
            [TermFilter('default', [True])]))

        if q_term is not None:
            # Filter search results with query string
            q_filter = QueryFilter(query=StringQuery(query=q_term + '*'))
            res = _conn.search(query=FilteredQuery(f_query, q_filter),
                size='100', **kwargs)
        else:
            res = _conn.search(query=f_query, size='100', **kwargs)
        try:
            # Sort results on ID
            res_sorted = sorted(res.hits, key=lambda k: k['fields']['id'])
            return [ds['fields'] for ds in res_sorted]
        except KeyError:
            # Likely empty response
            return list()

    @staticmethod
    def get_ds_li(rep_li):
        """Return dataset list for provided reporters"""
        _conn = DatasetQuery.conn
        t_query = TermsQuery('reporter', rep_li.strip(' ').split(','))
        # *** No spaces between field names. Undocumented and important! ***
        res = _conn.search(query=HasChildQuery(type='by_reporter',
            query=t_query), **{'fields': 'id,name,factors'})
        try:
            return [ds['fields'] for ds in res.hits]
        except KeyError:
            # Likely empty response
            return list()

    @staticmethod
    def get_ds_page(rep_li, page, q_term=None):
        """Return page of dataset results for provided query type and terms"""
        _conn = DatasetQuery.conn
        all_results = list()
        # *** No spaces between field names. Undocumented and important! ***
        kwargs = {'doc_types': 'dataset', 'indices': 'biogps_dataset',
            'fields': 'id,name,factors'}
        t_query = TermsQuery('reporter', rep_li.strip(' ').split(','))
        base_query = HasChildQuery(type='by_reporter', query=t_query)

        if q_term is not None:
            # Filter search results with query string
            q_filter = QueryFilter(query=StringQuery(query=q_term + '*'))
            all_results = _conn.search(query=FilteredQuery(base_query,
                q_filter), **kwargs)
        else:
            all_results = _conn.search(base_query, **kwargs)

        # Now have total number of results, use Django paginator example at:
        # https://docs.djangoproject.com/en/dev/topics/pagination/
        paginator = Paginator(all_results, 15)
        try:
            _datasets = paginator.page(int(page))
        except (PageNotAnInteger, ValueError):
            # If page is not an integer, deliver first page.
            _datasets = paginator.page(1)
        except EmptyPage:
            # If page is out of range (e.g. 9999), deliver last page of results
            _datasets = paginator.page(paginator.num_pages)
        except ElasticSearchException:
            # If any invalid query, return empty results.
            return (0, 1, [])
        return (all_results.count(), paginator.num_pages,
            _datasets.object_list)

    @staticmethod
    def get_mygene_reps(gene_id):
        """Return reporter list for provided gene"""
        rep_li = []
        mg = MyGeneInfo()
        g = mg.get_gene(gene_id, fields='entrezgene,reporter,refseq.rna')
        if g:
            if 'reporter' in g:
                rep_dict = g['reporter']
                for key in rep_dict.keys():
                    for val in alwayslist(rep_dict[key]):
                        rep_li.append(val)

        return ','.join(rep_li)
