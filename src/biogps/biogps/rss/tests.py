from django.test import Client
from biogps.test.utils import eq_


def test_rss_plugins():
    c = Client()
    res = c.get('/rss/plugins/')
    eq_(res.status_code, 200)
    eq_(res['Content-Type'], 'application/rss+xml; charset=utf-8')
