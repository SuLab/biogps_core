from django.test import Client
from biogps.test.utils import eq_, json_ok


def test_dataset():
    c = Client()
    res = c.get('/service/datasetlist2/240/')
    eq_(res.status_code, 200)
    json_ok(res)

def test_chart():
    c = Client()
    res = c.get('/service/datasetchart2/240/1431_at/')
    eq_(res.status_code, 200)
    eq_(res['Content-Type'], 'image/png')

def test_probeset_values():
    c = Client()
    res = c.get('/service/datasetvalues2/239/?reporters=1431_at,31348_at,820_at')
    eq_(res.status_code, 200)
    json_ok(res)
