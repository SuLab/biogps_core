import time
from django.test import Client
from biogps.test.utils import eq_, assert_not_equal
from threadedcomments.models import ThreadedComment


def test_comment_form_unauth():
    # Not logged in
    c = Client()
    res = c.get('/comment/plugin/641/secure_comment_form_1_reply/')
    eq_(res.status_code, 302)
    eq_(res['Content-Type'], 'text/html; charset=utf-8')
    assert_not_equal(res['Location'].find('/auth/login/'), -1)


def test_comment_form_auth():
    # Logged in
    c = Client()
    c.login(username='cwudemo', password='123')
    res = c.get('/comment/plugin/641/secure_comment_form_1_reply/')
    eq_(res.status_code, 200)
    eq_(res['Content-Type'], 'text/html; charset=utf-8')


def test_edit_comment():
    comment_obj = ThreadedComment.objects.get(id=206)
    orig_comment = comment_obj.comment

    c = Client()
    c.login(username='cwudemo', password='123')
    res = c.get('/comment/plugin/641/secure_comment_form_206_edit/')
    eq_(res.status_code, 200)
    eq_(res['Content-Type'], 'text/html; charset=utf-8')
    put_dict = dict()
    put_dict['comment'] = 'Nose test comment'
    put_dict['honeypot'] = ''
    put_dict['object_pk'] = '641'
    put_dict['parent'] = '206'
    put_dict['timestamp'] = str(int(time.time()))

    # Get content type from form
    search_term = 'name="content_type" value="'
    ctype_start = res.content.find(search_term)
    ctype_start += len(search_term)
    ctype_end = res.content[ctype_start:].find('"')
    put_dict['content_type'] = res.content[ctype_start: (ctype_start +
                                                                  ctype_end)]

    # Get middleware token from form
    search_term = "name=\'csrfmiddlewaretoken\' value=\'"
    token_start = res.content.find(search_term)
    token_start += len(search_term)
    token_end = res.content[token_start:].find("\'")
    put_dict['csrfmiddlewaretoken'] = res.content[token_start: (token_start +
                                                                  token_end)]

    # Get security hash from form
    search_term = 'name="security_hash" value="'
    hash_start = res.content.find(search_term)
    hash_start += len(search_term)
    hash_end = res.content[hash_start:].find('"')
    put_dict['security_hash'] = res.content[hash_start: (hash_start +
                                                                   hash_end)]

    # Put comment form
    res = c.put('/comment/plugin/641/206/', put_dict)
    eq_(res.status_code, 200)

    # Revert comment to original
    comment_obj = ThreadedComment.objects.get(id=206)
    comment_obj.comment = orig_comment
    comment_obj.save()


def test_submit_comment():
    c = Client()
    c.login(username='cwudemo', password='123')
    res = c.get('/comment/plugin/641/secure_comment_form_206_reply/')
    eq_(res.status_code, 200)
    eq_(res['Content-Type'], 'text/html; charset=utf-8')
    post_dict = dict()
    post_dict['comment'] = 'Nose test comment'
    post_dict['honeypot'] = ''
    post_dict['object_pk'] = '641'
    post_dict['parent'] = '206'
    post_dict['timestamp'] = str(int(time.time()))

    # Get content type from form
    search_term = 'name="content_type" value="'
    ctype_start = res.content.find(search_term)
    ctype_start += len(search_term)
    ctype_end = res.content[ctype_start:].find('"')
    post_dict['content_type'] = res.content[ctype_start: (ctype_start +
                                                                  ctype_end)]

    # Get middleware token from form
    search_term = "name=\'csrfmiddlewaretoken\' value=\'"
    token_start = res.content.find(search_term)
    token_start += len(search_term)
    token_end = res.content[token_start:].find("\'")
    post_dict['csrfmiddlewaretoken'] = res.content[token_start: (token_start +
                                                                  token_end)]

    # Get security hash from form
    search_term = 'name="security_hash" value="'
    hash_start = res.content.find(search_term)
    hash_start += len(search_term)
    hash_end = res.content[hash_start:].find('"')
    post_dict['security_hash'] = res.content[hash_start: (hash_start +
                                                                   hash_end)]

    res = c.post('/comment/plugin/641/', post_dict, follow=True)
    eq_(res.status_code, 200)

    # Delete test comment
    #comment_obj = ThreadedComment.objects.get(comment='Nose test comment')
    #comment_obj.delete()
