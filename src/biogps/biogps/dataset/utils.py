from biogps.boe.views import MyGeneInfo
from biogps.utils.helper import alwayslist
from biogps.utils.const import species_d
from django.conf import settings

import types
import requests


def sanitize(ds_id):
    """Return sanitized (uppercase if applicable) dataset ID"""
    return ds_id.upper() if type(ds_id) in types.StringTypes else ds_id


def safe_int(s):
    try:
        s = int(s)
    except:
        pass
    return s

class DatasetQuery():
    """Generic class container for dataset query functions"""

    @staticmethod
    def get_ds(ds_id):
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/'+ds_id+'/4-biogps/')
        if res.json()['code'] != 0:
            return None

        ds = res.json()['details']
        owner_map = {
            'Andrew Su': '/profile/3/asu',
            'Tom Freeman': '/profile/309/tfreeman',
            'ArrayExpress Uploader': '/profile/8773/arrayexpressuploader',
            'ERCC': '/profile/10501/ercc'
        }
        try:
            ds['owner_profile'] = owner_map[ds['owner']]
        except:
            ds['owner_profile'] = None
        if 'species' in ds:
            ds['species'] = species_d.get(safe_int(ds['species']), ds['species'])
        return ds

    @staticmethod
    def get_default_ds(gene_id):
        """Return default dataset for the given gene"""
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/default?gene=%s' % gene_id)
        if res.json()['code'] != 0:
            return None
        ds = res.json()['details']
        if ds['dataset']:
            return ds

    @staticmethod
    def get_ds_data(ds_id, gene_id):
        """Return data for the given dataset and gene"""
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/data/{}/gene/{}/'.format(ds_id, gene_id))
        if res.json()['code'] != 0:
            return None
        data = res.json()['details']
        return data

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
