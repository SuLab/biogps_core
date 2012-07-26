''' Empty gene model used only for valid content type with favorites, etc.'''
from django.db import models
from biogps.apps.boc import boc_svc as boc


def get_gene_list(geneid_li):
    if geneid_li:
        ds = boc.DataService()
        gene_list = ds.querygenelist(geneid_li)
    else:
        gene_list = []
    return gene_list

class Gene(models.Model):
    short_name = 'gene'

