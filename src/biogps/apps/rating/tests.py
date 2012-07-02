from django.test import Client
from biogps.test.utils import eq_, json_ok


def test_rating_submit():
    c = Client()
    c.login(username='cwudemo', password='123')
    res = c.post('/rating/plugin/641/', {'rating': '5'})
    eq_(res.status_code, 200)
    json_ok(res)
