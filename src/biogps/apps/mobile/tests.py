from django.test import Client
from biogps.test.utils import (eq_, page_match, content_match)


def test_redirect():
    pass


def test_mobile():
    c = Client()
    page_match(c, '/m/', 'Search genes by Symbol or Accession')


def test_mobile_search_blank():
    c = Client()
    test_url = '/m/search/'

    res = c.get(test_url)
    eq_(res.status_code, 302)

    res = c.post(test_url, dict(query=""))
    eq_(res.status_code, 302)


def test_mobile_search():
    c = Client()
    test_url = '/m/search/'

    res = c.post(test_url, dict(query="cdk2+cdk3"))
    content_match(res, 'CDK2')

    res = c.post(test_url, dict(query="cdk?"))
    content_match(res, 'CDK2')

    res = c.post(test_url, dict(query="GO:0006275"))
    content_match(res, 'CDK2')

    res = c.post(test_url, dict(query="1007_s_at+1053_at+117_at+121_at+1255_g_at+1294_at+1316_at+1320_at+1405_i_at+1431_at"))
    content_match(res, 'DDR1')

    res = c.post(test_url, dict(query="IPR008351"))
    content_match(res, 'CDK2')


def test_mobile_gene():
    c = Client()
    #with default layout
    page_match(c, '/m/gene/1017/', 'Gene Identifiers')

    #with layoutid parameter
    page_match(c, '/m/gene/1017/?layoutid=170', 'KEGG')   # KEGG layout
