# -*- coding: utf-8 -*-

from django.test import Client
from biogps.test.utils import eq_, json_ok, ext_ok


def test_query():
    c = Client()
    test_url = '/boc/'  # for BOC SL

    res = c.post(test_url, dict(query="cdk2+cdk3"))
    ext_ok(res)

    res = c.post(test_url, dict(query="cdk?"))
    ext_ok(res)

    res = c.post(test_url, dict(query="GO:0006275"))
    ext_ok(res)

    res = c.post(test_url, dict(query="BTK", qtype='keyword'))
    ext_ok(res)

    res = c.post(test_url, dict(query="1007_s_at+1053_at+117_at+121_at+1255_g_at+1294_at+1316_at+1320_at+1405_i_at+1431_at"))
    ext_ok(res)

    res = c.post(test_url, dict(query="IPR008351"))
    ext_ok(res)


def test_query_interval():
    c = Client()
    test_url = '/boc/'  # for BOC SL
    #human
    res = c.post(test_url, dict(genomeassembly='human',
                                searchby='searchbyinterval',
                                genomeinterval_string="chrX:151,073,054-151,383,976",
                                genomeinterval_unit='Mb'))
    json_ok(res)
    #mouse
    res = c.post(test_url, dict(genomeassembly='mouse',
                                searchby='searchbyinterval',
                                genomeinterval_chr='5',
                                genomeinterval_start='100',
                                genomeinterval_end='110',
                                genomeinterval_unit='Mb'))
    json_ok(res)

    #rat
    res = c.post(test_url, dict(genomeassembly='rat',
                                searchby='searchbyinterval',
                                genomeinterval_chr='10',
                                genomeinterval_start='32',
                                genomeinterval_end='37',
                                genomeinterval_unit='Mb'))
    json_ok(res)


def test_gene_identifier():
    c = Client()
    res = c.get('/boc/getgeneidentifiers/', dict(geneid=1017, format='json'))
    json_ok(res)


def test_gene_identifier2():
    c = Client()
    res = c.get('/boc/gene/1017/identifiers/')
    json_ok(res)


def test_get_homologene():
    c = Client()
    res = c.get('/boc/gene/1017/homologene/')
    json_ok(res)


def test_get_gene():
    c = Client()
    res = c.get('/boc/gene/1017/')
    json_ok(res)


def test_unicode_query():
    # When unicode query is passed, UnicodeEncodeError should not be raised.
    c = Client()
    test_url = '/boc/'  # for BOC SL

    import logging
    # turn off info logging because logging cannot handle unicode when logging is
    # sent to a console during a test
    log = logging.getLogger('biogps_prod')
    log.setLevel(logging.WARNING)

    res = c.post(test_url, dict(query="基因"))
    ext_ok(res)

    res = c.get(test_url+'?query=基因')
    ext_ok(res)

    log.setLevel(logging.INFO)


