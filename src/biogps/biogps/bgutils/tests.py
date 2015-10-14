from django.test import Client
from biogps.test.utils import eq_


def test_proxy():
    c = Client()
    res = c.get('/utils/proxy?url=http://plugins.biogps.org/data_chart/data_chart.cgi?id=66912%26container=ext-gen4765%26host=biogps.gnf.org&secure=1')
    eq_(res.status_code, 200)
    res = c.get('/utils/proxy?url=http://www.google.com')
    eq_(res.status_code, 400)
