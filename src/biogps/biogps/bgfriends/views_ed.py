#This provides API exposed via Ext.Direct RPC protocol
from django.conf import settings
from django.contrib.auth.models import User
from friends.models import friend_set_for, FriendshipInvitation
from friends.forms import InviteFriendForm, JoinRequestForm

from biogps.extdirect.views import remoting, remote_provider


@remoting(remote_provider, action='friends', form_handler=True, login_required=True)
def search_user_by_email(request):
    email = request.POST.get("email", '').strip().lower()
    if email:
        user_li = User.objects.filter(email__iexact=email)  \
                              .exclude(is_active=False) \
                              .exclude(pk=request.user.id)  # exclude myself
        if not settings.DEBUG:
            user_li = user_li.exclude(flag__type='D')   # exclude demo accounts flagged in UserFlag model
    else:
        user_li = []
    myfriends = friend_set_for(request.user)
    invited_users = dict(set([(invitation.to_user, invitation.get_status_display()) for invitation in request.user.invitations_from.exclude(status="5")]))
    data = {'success': True,
            'thatisme': request.user.email == email,  # True if query email matches current user self.
            'totalCount': user_li.count(),
            'users': [dict(name=u.get_full_name().encode('utf-8') or u.username,
                           uid=u.pk,
                           username=u.username,
                           profile_url=u.get_absolute_url(),
                           is_friend=u in myfriends,
                           invited=invited_users.get(u, None)) for u in user_li]}
    return data


@remoting(remote_provider, action='friends', form_handler=True, login_required=True)
def invite_friend(request):
    '''send invitation to someone.'''
    form = InviteFriendForm(request.user, request.extdirect_post_data)
    if form.is_valid():
        invitation = form.save()
        data = {'success': True,
                'invitation_id': invitation.id}
    else:
        data = {'success': False,
                'errors': form.errors}

    return data


@remoting(remote_provider, action='friends', form_handler=True, login_required=True)
def invite_to_join(request):
    """send a join request to someone."""
    form = JoinRequestForm(request.extdirect_post_data)
    if form.is_valid():
        join_request = form.save(request.user)
        data = {'success': True,
                'invitation_id': join_request.id}
    else:
        data = {'success': False,
                'errors': form.errors}
    return data


# The following ext_direct methods are currently not in use:
@remoting(remote_provider, action='friends', login_required=True)
def list(request):
    '''return the list of my friends.'''
    return [dict(username=u.username,
                 name=u.get_valid_name()) for u in request.user.friends.all()]


@remoting(remote_provider, action='friends', login_required=True)
def accept(request):
    '''accept an received invitation.'''
    invitation_id = request.POST.get("invitation", None)
    data = dict(success=False)
    try:
        invitation = FriendshipInvitation.objects.get(id=invitation_id)
        if invitation.to_user == request.user:
            invitation.accept()
            request.user.message_set.create(message="Accepted friendship request from %(from_user)s" % {'from_user': invitation.from_user})
            data = dict(success=True)
    except FriendshipInvitation.DoesNotExist:
        pass
    return data


@remoting(remote_provider, action='friends', login_required=True)
def reject(request):
    '''reject an received invitation.'''
    invitation_id = request.POST.get("invitation", None)
    data = dict(success=False)
    try:
        invitation = FriendshipInvitation.objects.get(id=invitation_id)
        if invitation.to_user == request.user:
            invitation.decline()
            request.user.message_set.create(message="Rejected friendship request from %(from_user)s" % {'from_user': invitation.from_user})
            data = dict(success=True)
    except FriendshipInvitation.DoesNotExist:
        pass
    return data


@remoting(remote_provider, action='friends', login_required=True)
def invitations(request):
    invites_received = [dict(id=inv.id, from_user=inv.from_user.get_valid_name()) for inv in request.user.invitations_to.invitations().order_by("-sent")]
    invites_sent = [dict(id=inv.id, from_user=inv.from_user.get_valid_name()) for inv in request.user.invitations_from.invitations().order_by("-sent")]
    joins_sent = [dict(id=inv.id, from_user=inv.from_user.get_valid_name()) for inv in request.user.join_from.all().order_by("-sent")]
    return dict(invites_received=invites_received,
                invites_sent=invites_sent,
                joins_sent=joins_sent)
