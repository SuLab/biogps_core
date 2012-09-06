''' Empty gene model used only for valid content type with favorites, etc.'''
import copy

from biogps.apps.boc import boc_svc as boc
from biogps.utils.remote_models import RemoteModel


def get_gene_list(geneid_li):
    if geneid_li:
        ds = boc.DataService()
        gene_list = ds.querygenelist(geneid_li)
    else:
        gene_list = []
    return gene_list


class Gene(RemoteModel):
    short_name = 'gene'
    _ds = boc.DataService()
    _default_fields = ['symbol', 'name', 'taxid', 'homologene']

    def _as_obj(self, dict):
        '''convert input dict to a Model instance.'''
        for attr in self._default_fields:
            value = dict.get(attr, None)
            if value:
                setattr(self, attr, value)
        self.id = dict['_id']
        self.pk = self.id
        return self

    def _get_obj_by_id(self, id):
        _g = self._ds.getgene(id)
        return self._as_obj(_g)

    def _get_obj_by_id_list(self, id_list):
        gene_list = self._ds.getgenelist(id_list)
        return [copy.copy(self._as_obj(g)) for g in gene_list]

    def _count(self):
        return self._ds.get_metadata()['TOTAL_GENE_DOC']

    def __unicode__(self):
        return u'"%s" (id: %s)' % (self.symbol, self.id)

    def object_cvt(self, mode=None):
        '''Convert Gene object into a json-able dictionary.
           This method consistent with BioGPSModel.
        '''
        out = {'id': self.id}
        for attr in ['id'] + self._default_fields:
            value = getattr(self, attr, None)
            if value:
                out[attr] = value
        return out


import tagging
try:
    tagging.register(Gene)
except tagging.AlreadyRegistered:
    pass
        