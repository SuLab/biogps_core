from django.shortcuts import get_object_or_404, render_to_response
from django.template import RequestContext
from django.http import HttpResponseRedirect
from django.contrib.comments import Comment
from django.core.urlresolvers import reverse
from friends.models import (FriendshipInvitation, Friendship,
                            JoinInvitation, friend_set_for)
from friends.forms import InviteFriendForm, JoinRequestForm
from biogps.friends.forms import ImportVCardForm
from biogps.auth2.forms import RegistrationForm
from friends.importer import import_yahoo, import_google

from biogps.utils.helper import (allowedrequestmethod,
                                 loginrequired,
                                 loginrequired_or_redirect,
                                 JSONResponse)
from biogps.utils.decorators import not_authenticated


@loginrequired_or_redirect
@allowedrequestmethod('POST', 'GET')
def invite_friend(request):
    '''/friends/invite/'''

    if request.method == 'POST':
        form = InviteFriendForm(request.user, request.POST)
        if form.is_valid():
            invitation = form.save()
            data = {'success': True,
                    'invitation_id': invitation.id}
        else:
            data = {'success': False,
                    'errors': form.errors}

        return JSONResponse(data)
    else:
        form = InviteFriendForm(request.user)
        return render_to_response('friends/invite_friend.html',
                                  {'form': form},
                                  context_instance=RequestContext(request))


@loginrequired_or_redirect
def friends(request, template_name="friends/friends.html"):
    '''/friends/'''
    if request.method == "POST":
        invitation_id = request.POST.get("invitation", None)
        if request.POST["action"] == "accept":
            try:
                invitation = FriendshipInvitation.objects.get(id=invitation_id)
                if invitation.to_user == request.user:
                    invitation.accept()
                    #request.user.message_set.create(message=_("Accepted friendship request from %(from_user)s") % {'from_user': invitation.from_user})
            except FriendshipInvitation.DoesNotExist:
                pass
        elif request.POST["action"] == "decline":
            try:
                invitation = FriendshipInvitation.objects.get(id=invitation_id)
                if invitation.to_user == request.user:
                    invitation.decline()
                    #request.user.message_set.create(message=_("Declined friendship request from %(from_user)s") % {'from_user': invitation.from_user})
            except FriendshipInvitation.DoesNotExist:
                pass
    #friends = request.user.friends.all().order_by('-added')
    friends = Friendship.objects.friends_for_user(request.user)
    invites_received = request.user.invitations_to.invitations().order_by("-sent")
    invites_sent = request.user.invitations_from.invitations().order_by("-sent")
    joins_sent = request.user.join_from.all().order_by("-sent")

    return render_to_response(template_name, {
        "friends": friends,
        "invites_received": invites_received,
        "invites_sent": invites_sent,
        "joins_sent": joins_sent,
    }, context_instance=RequestContext(request))


@not_authenticated
def accept_join(request, confirmation_key, form_class=RegistrationForm,
                 template_name='auth/registration_form.html'):
    '''/friends/accept/<inv_id>'''

    join_invitation = get_object_or_404(JoinInvitation,
                                        confirmation_key=confirmation_key.lower())

#    #no need for this part because of the use of not_authenticated decorator
#    if request.user.is_authenticated():
#        return render_to_response(template_name, {}, context_instance=RequestContext(request))
#    else:
    form = form_class(initial={"email": join_invitation.contact.email,
                               "invitation_key": join_invitation.confirmation_key})
    return render_to_response(template_name, {
        "form": form,
    }, context_instance=RequestContext(request))


@loginrequired_or_redirect
def contacts(request, form_class=ImportVCardForm,
        template_name="friends/contacts.html", includeyahoo=False):
    '''/friends/contacts/'''
    if request.method == "POST":

        if request.POST["action"] == "contacts_delete_all":
            request.user.contacts.all().delete()
            import_vcard_form = form_class()
        elif request.POST["action"] == "contacts_delete_selected":
            contacts_to_delete = request.POST.getlist('contact_id')
            if contacts_to_delete:
                request.user.contacts.filter(pk__in=contacts_to_delete).delete()
            import_vcard_form = form_class()

        elif request.POST["action"] == "upload_vcard":
            import_vcard_form = form_class(request.POST, request.FILES)
            if import_vcard_form.is_valid():
                imported, total = import_vcard_form.save(request.user)
                #request.user.message_set.create(message=_("%(total)s vCards found, %(imported)s contacts imported.") % {'imported': imported, 'total': total})
                import_vcard_form = ImportVCardForm()
        else:
            import_vcard_form = form_class()
            if request.POST["action"] == "import_yahoo":
                bbauth_token = request.session.get('bbauth_token')
                del request.session['bbauth_token']
                if bbauth_token:
                    imported, total = import_yahoo(bbauth_token, request.user)
                    #request.user.message_set.create(message=_("%(total)s people with email found, %(imported)s contacts imported.") % {'imported': imported, 'total': total})
            if request.POST["action"] == "import_google":
                authsub_token = request.session.get('authsub_token')
                del request.session['authsub_token']
                if authsub_token:
                    imported, total = import_google(authsub_token, request.user)
                    #request.user.message_set.create(message=_("%(total)s people with email found, %(imported)s contacts imported.") % {'imported': imported, 'total': total})
    else:
        import_vcard_form = form_class()

    return render_to_response(template_name, {
        "import_vcard_form": import_vcard_form,
        "bbauth_token": request.session.get('bbauth_token'),
        "authsub_token": request.session.get('authsub_token'),
        "includeyahoo": includeyahoo,
    }, context_instance=RequestContext(request))


@loginrequired
def invite_to_join(request, form_class=JoinRequestForm, **kwargs):
    template_name = kwargs.get("template_name", "friends_app/invite.html")
    if request.is_ajax():
        template_name = kwargs.get("template_name_facebox",
                                   "friends_app/invite_facebox.html")

    join_request_form = form_class()
    if request.method == "POST":
        join_request_form = form_class(request.POST)
        if join_request_form.is_valid():
            join_request_form.save(request.user)
            return HttpResponseRedirect(reverse('invitations'))
    return render_to_response(template_name, {
        "join_request_form": join_request_form,
        }, context_instance=RequestContext(request))


@loginrequired
def friends_objects(request, template_name, friends_objects_function, extra_context={}):
    """
    Display friends' objects.

    This view takes a template name and a function. The function should
    take an iterator over users and return an iterator over objects
    belonging to those users. This iterator over objects is then passed
    to the template of the given name as ``object_list``.

    The template is also passed variable defined in ``extra_context``
    which should be a dictionary of variable names to functions taking a
    request object and returning the value for that variable.
    """

    friends = friend_set_for(request.user)

    dictionary = {
        "object_list": friends_objects_function(friends),
    }
    for name, func in extra_context.items():
        dictionary[name] = func(request)

    return render_to_response(template_name, dictionary, context_instance=RequestContext(request))


@loginrequired
def friends_activity(user):
    """
    Return reverse-sorted json of friends' recent activity.
    """
    friend_set = friend_set_for(user)
    activity = list()

    # Get 5 most recent activities for each friend in each category
    for friend in friend_set:
        categories = list((friend.rating_set.order_by('-submit_date')[:5],
                          friend.favorite_set.order_by('-submit_date')[:5],
                          Comment.objects.filter(user=friend).order_by(
                                                          '-submit_date')[:5]))
        for category in categories:
            for item in category:
                if item:
                    activity.append(list((item.submit_date, item)))

    # Sort by submit date - newest first
    activity.sort(reverse=True)

    # Simplify to single list of activities
    for index, item in enumerate(activity):
        activity[index] = item[1]

    return JSONResponse(activity)
