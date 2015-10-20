from biogps.test.utils import (ok_, eq_, _d,
                               json_ok, ext_ok,
                               page_match, content_match,
                               nottest, get_user_context)
from django.contrib.auth.models import User
from friends.models import FriendshipInvitation, friend_set_for


@nottest
def _send_an_test_invitation(from_user='cwudemo4', to_user='cwudemo3'):
    c = get_user_context(username=from_user)
    res = c.post('/friends/invite/', {'to_user': to_user,
                                      'message': 'for test_invite_friend'})
    ext_ok(res)
    invitation_id = _d(res.content)['invitation_id']
    return invitation_id


@nottest
def _cleanup_test_friendship():
    '''remove created test friendship.'''
    for test_user in ['cwudemo3', 'cwudemo4']:
        u = User.objects.get(username=test_user)
        u.friends.all().delete()
        u.join_from.all().delete()
        u.invitations_from.all().delete()
        u.invitations_to.all().delete()
        u.invitations_from_history.all().delete()
        u.invitations_to_history.all().delete()


@nottest
def teardown_test_environment():
    _cleanup_test_friendship()


def test_friends():
    c = get_user_context(username='cwudemo4')
    page_match(c, '/friends/', 'Friends on BioGPS')


def test_invite_friend():
    c = get_user_context(username='cwudemo4')
    page_match(c, '/friends/invite/', 'Invite a friend')

    res = c.post('/friends/invite/', {'to_user': 'cwudemo3',
                                      'message': 'for test_invite_friend'})
    ext_ok(res)
    _cleanup_test_friendship()


def test_invitation_accept():
    invitation_id = _send_an_test_invitation(from_user='cwudemo4',
                                             to_user='cwudemo3')

    c = get_user_context(username='cwudemo3')
    res = c.post('/friends/', {'invitation': invitation_id,
                               'action': 'accept'})
    content_match(res, 'cwudemo4')
    eq_(FriendshipInvitation.objects.get(id=invitation_id).status, "5")

    from_user = User.objects.get(username='cwudemo4')
    to_user = User.objects.get(username='cwudemo3')
    ok_(to_user in friend_set_for(from_user))
    ok_(from_user in friend_set_for(to_user))

    _cleanup_test_friendship()


def test_invitation_decline():
    invitation_id = _send_an_test_invitation(from_user='cwudemo4',
                                             to_user='cwudemo3')

    c = get_user_context(username='cwudemo3')
    res = c.post('/friends/', {'invitation': invitation_id,
                               'action': 'decline'})
    eq_(res.status_code, 200)
    eq_(FriendshipInvitation.objects.get(id=invitation_id).status, "6")

    from_user = User.objects.get(username='cwudemo4')
    to_user = User.objects.get(username='cwudemo3')
    ok_(to_user not in friend_set_for(from_user))
    ok_(from_user not in friend_set_for(to_user))

    _cleanup_test_friendship()


# The follows tests are testing methods exposed via ExtDirect:
@nottest
def _call_extdirect(c, method, params):
    data = {'extAction': 'friends',
            'extMethod': method,
            'extTID': 1,
            'extType': 'rpc',
            'extUpload': False}
    data.update(params)
    res = c.post('/extdirect/remoting/router/', data)
    json_ok(res)
    res_data = _d(res.content)['result']
    ok_(res_data['success'])
    return res_data


def test_ed_search_user_by_email():
    c = get_user_context(username='cwudemo4')
    params = {'email': 'biogps-test@biogps.org'}
    res_data = _call_extdirect(c, 'search_user_by_email', params)
    ok_(len(res_data['users']) > 0)


def test_ed_invite_friend():
    c = get_user_context(username='cwudemo4')
    params = {'to_user': 'cwudemo3',
              'message': 'for test_invite_friend'}
    res_data = _call_extdirect(c, 'invite_friend', params)
    invitation_id = res_data['invitation_id']

    _cleanup_test_friendship()


def test_ed_invite_to_join():
    c = get_user_context(username='cwudemo4')
    params = {'email': 'test@biogps.org',
              'message': 'for test_invite_to_join'}
    res_data = _call_extdirect(c, 'invite_to_join', params)
    invitation_id = res_data['invitation_id']

    _cleanup_test_friendship()
