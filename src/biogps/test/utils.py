from django.test import Client
from biogps.utils import json
from nose.tools import *

#==============================================================================
# Utility functions provided from nose.tools
# Ref: http://somethingaboutorange.com/mrl/projects/nose/0.11.0/testing_tools.html
# Some examples:
#    ok_      Shorthand for assert. Saves 3 whole characters!
#    eq_      Shorthand for 'assert a == b, "%r != %r" % (a, b)'
#    istest   Decorator to mark a function or method as a test
#    nottest  Decorator to mark a function or method as not a test
#==============================================================================


_d = json.loads    # shorthand for json decode
_e = json.dumps    # shorthand for json encode

def json_ok(res):
    '''Test if
          * the response returns 200
          * returns a valid json string.
       res is response object return from django test client.
       decoded json object is returned
    '''
    eq_(res.status_code,200)
    return _d(res.content)

def xml_ok(res):
    '''Test if
          * the response returns 200
          * returns a valid XML string.
       res is response object return from django test client.
       parsed ElementTree object is returned.
    '''
    import xml.etree.cElementTree as ET
    eq_(res.status_code,200)
    return ET.fromstring(res.content)

def ext_ok(res):
    '''Test if
          * the response returns 200
          * returns a valid json string.
          * returned obj has "success" attribute as true
       res is response object return from django test client.
    '''
    eq_(res.status_code,200)
    eq_(_d(res.content)['success'], True, res.content)

def ext_fail(res):
    '''Test if
          * the response returns 200
          * returns a valid json string.
          * returned obj has "success" attribute as false
       res is response object return from django test client.
    '''
    eq_(res.status_code,200)
    eq_(_d(res.content)['success'], False, res.content)


def content_match(res, match_str):
    '''Test if the content of a response object contains <match_str> or now.'''
    eq_(res.status_code,200)
    assert res.content.find(match_str) != -1, res.content


def page_match(client, url, match_str, param={}):
    '''Test if response for given <url> (via GET) contains <match_str>
       Params:
           client    django test client
           url       url to test
           match_str string to test matches
           param     extra parameters passed to client.get

    '''
    res = client.get(url, param)
    content_match(res, match_str)
    return res


def get_user_context(username='cwudemo', password='123'):
    '''A convenient function returns an authenticated django test client.'''
    c = Client()
    assert c.login(username=username, password=password)
    return c