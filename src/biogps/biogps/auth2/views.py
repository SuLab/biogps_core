from django.conf import settings
from django.contrib import auth
from django.core.urlresolvers import reverse
from django.http import (HttpResponse, HttpResponseBadRequest,
                        HttpResponseRedirect)
from django.template.loader import render_to_string
from django.utils.encoding import smart_str
from django.utils.http import urlquote_plus
from django.views.decorators.cache import never_cache
from django.contrib.sites.models import Site
from django.contrib.auth.models import User, Group
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX

from biogps.utils.helper import (allowedrequestmethod,
                               loginrequired,
                               loginrequired_or_redirect,
                               openidrequired,
                               is_valid_parameter,
                               JSONResponse,
                               biogpsError,
                               HttpResponseRedirectWithIEFix,
                               json)
from biogps.utils.decorators import not_authenticated
from biogps.utils.http import render_to_response
from django_authopenid.forms import OpenidSigninForm, ChangeopenidForm
from django_authopenid.views import get_url_host, sreg, ask_openid, complete
from django_authopenid.util import from_openid_response
from django_authopenid.models import UserAssociation
import urllib

from forms import (RegistrationForm, OpenidVerifyForm, ForgetUsernameForm,
                   EditUserInfoForm, PasswordResetForm)
from models import UserProfile, expanded_username_list

from django.utils.translation import ugettext as _
from account.util import render_to, email_template
from account.views import hostname, message
from urlauth.util import wrap_url
from account.views import ChangePasswordForm
from account import signals
from django.shortcuts import redirect

from biogps.utils import log


def _send_email(email, subject_template, msg_template, msg_context):
    """A shortcut for send out email."""
    from django.core.mail import send_mail
    current_site = Site.objects.get_current()
    subject = render_to_string(subject_template, {'site': current_site })
    # Email subject *must not* contain newlines
    subject = ''.join(subject.splitlines())
    msg_context['site'] = current_site
    message = render_to_string(msg_template, msg_context)
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])

def _send_html_email(email, subject_template, msg_template, msg_context):
    from django.core.mail import EmailMessage
    current_site = Site.objects.get_current()
    subject = render_to_string(subject_template, {'site': current_site })
    # Email subject *must not* contain newlines
    subject = ''.join(subject.splitlines())
    msg_context['site'] = current_site
    message = render_to_string(msg_template, msg_context)

    msg = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
    msg.content_subtype = "html"
    msg.send()

def clean_next(next_url):
    DEFAULT_NEXT = '/'
    if not next_url:
        return DEFAULT_NEXT
    next_url = urllib.unquote(next_url).encode('utf-8')
    next_url = next_url.strip()
    #disallow redirect to external URL
    if next_url.lower().startswith('http'):
        next_url = DEFAULT_NEXT
    return next_url


@loginrequired_or_redirect
def dashboard(request, template='auth/user_account_dashboard.html'):
    msg = request.GET.get('msg', '')
    return render_to_response(request, template, {'msg': msg})


def check_username(request, username):
    '''
    Check if the username was taken on ADAM server.
    '''
    if not username or not is_valid_parameter(username, maxlen=30):
        data = {'success': True, 'valid': False, 'reason': 'Invalid username.'}
    else:
        if User.objects.filter(username__in=expanded_username_list(username.lower())).count() == 0:
            data = {'success': True, 'valid': True}
        else:
            data = {'success': True, 'valid': False, 'reason': 'This username is taken.'}
    return JSONResponse(data)

#@render_to('account/registration.html')
@not_authenticated
@render_to('auth/registration_form.html')
def registration(request, form_class=RegistrationForm):
    if not settings.ACCOUNT_REGISTRATION_ENABLED:
        return message(request, _('Sorry. Registration is disabled.'))
    if request.user.is_authenticated():
        return message(request, _('You have to logout before registration'))

    if 'POST' == request.method:
        form = form_class(request.POST, request.FILES)
    else:
        form = form_class()

    if form.is_valid():
        user = form.save()

        signals.account_created.send(None, user=user, request=request)
        password = form.cleaned_data['password']

        if settings.ACCOUNT_ACTIVATION_REQUIRED:
            url = 'http://%s%s' % (hostname, reverse('registration_complete'))
            url = wrap_url(url, uid=user.id, action='activation')
            params = {'domain': hostname, 'login': user.username, 'url': url,
                      'password': password}
            if email_template(user.email, 'account/mail/activation_required', **params):
                next_url = reverse('activation_required')
                if form.cleaned_data.get('signup_ann', False):
                    next_url += '?email=' + user.email
                return HttpResponseRedirect(next_url)
            else:
                user.delete()
                return message(request, _('The error was occuried while sending email with activation code. Account was not created. Please, try later.'))
        else:
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            auth.login(request, user)
            args = {'domain': hostname, 'user': user, 'password': password}
            email_template(user.email, 'account/mail/registration_complete', **args)
            return redirect(reverse(settings.ACCOUNT_REGISTRATION_REDIRECT_URLNAME))

    return {'form': form,
            }

@not_authenticated
def register_openid(request, template_name='auth/registration_form.html'):
    """
    register an openid.

    If user is already a member he can associate its openid with
    its account.

    A new account could also be created and automatically associated
    to the openid.
    """

    errors = None
    is_redirect = False
    next = clean_next(request.GET.get('next'))
    openid_ = request.session.get('openid', None)
    if not openid_:
        return HttpResponseRedirect(reverse('auth_login'))

    nickname = openid_.sreg.get('nickname', '')
    email = openid_.sreg.get('email', '')
    fullname = openid_.sreg.get('fullname', '')
    if fullname:
        _name = fullname.split(' ')
        lastname = _name[-1]
        firstname = ' '.join(_name[:-1])
    else:
        lastname, firstname = '', ''

    form = RegistrationForm(initial={
        'username': nickname,
        'email': email,
        'password': UNUSABLE_PASSWORD_PREFIX,
        'password_dup': UNUSABLE_PASSWORD_PREFIX,
        'first_name': firstname,
        'last_name': lastname,
    })
    openid_form = OpenidVerifyForm(initial={
        'next': next,
        'username': nickname,
    }, auto_id='openid_%s')

    if request.POST:
        just_completed = False
        if 'bnewaccount' in request.POST.keys():
            form = RegistrationForm(data=request.POST)
            if form.is_valid():
                is_redirect = True
                user = form.save()
                user.is_active = False   # set inactive for user to activate via the link in confirmation email
                user.set_unusable_password()
                user.save()

                # Add membership to the 'openid' group.
                # We do it manually instead of via user.grant_openid() because
                # through a series of dependencies, we can't make that call until
                # after the user has logged in for the first time.
                user.groups.add(Group.objects.get(name='openid'))

                # make association with openid
                uassoc = UserAssociation(openid_url=str(openid_),
                                         user_id=user.id)
                uassoc.save()

                #sending out activating email
                #this block of code were taken from account.views.registration
                url = 'http://%s%s' % (hostname, reverse('registration_complete'))
                url = wrap_url(url, uid=user.id, action='activation')
                params = {'domain': hostname, 'login': user.username, 'url': url}
                if email_template(user.email, 'account/mail/activation_required', **params):
                    #logging
                    log.info('username=%s clientip=%s action=user_signup', form.cleaned_data.get('username', ''), request.META.get('REMOTE_ADDR', ''))

                    next_url = reverse('activation_required')
                    print form.cleaned_data
                    if form.cleaned_data.get('signup_ann', False):
                        next_url += '?email=' + form.cleaned_data.get('email', '')
                    return HttpResponseRedirect(next_url)
                else:
                    user.delete()
                    return message(request, _('The error occurred while sending email with activation code. Account was not created. Please, try later.'))



        elif 'bverify' in request.POST.keys():
            form2 = OpenidVerifyForm(request.POST)
            if form2.is_valid():
                is_redirect = True
                next_url = clean_next(form2.cleaned_data.get('next'))
                user = form2.get_user()
                user.grant_openid()  # Add membership to the 'openid' group.

                # Don't let the association happens if there already is one.
                if UserAssociation.objects.filter(user=user.id).count() > 0:
                    return render_login_form(request,
                                             next_url,
                         message='Your account can only be associated with one OpenID URL at a time.')

                else:
                    uassoc = UserAssociation(openid_url=str(openid_),
                            user_id=user.id)
                    uassoc.save()
                    auth.login(request, user)
            else:
                # Take the first error message given.
                errors = form2.errors.popitem()[1]

        # redirect, can redirect only if forms are valid.
        if is_redirect:
            return HttpResponseRedirect(next_url)

    return render_to_response(request,
                              template_name,
                              {'form': form,
                               'openid_form': openid_form,
                               'errorlist': errors})


def render_login_form(request, goto_url, message=None, template_name='auth/login.html'):
    '''render actual login form.'''

    openid_login_form = OpenidSigninForm(initial={'next': goto_url})
    return render_to_response(request, template_name, {'goto_url': goto_url,
                                              'error_message': message,
                                              'form2': openid_login_form})


@never_cache
@allowedrequestmethod('GET', 'POST')
@not_authenticated
def login(request, template_name='auth/login.html'):

    if request.method == 'GET':
        goto_url = clean_next(request.GET.get('next', None))
        return render_to_response(request, template_name, {'goto_url': goto_url})

    elif request.method == "POST":

        if 'bsignin' in request.POST.keys():
            # openid_login
            openid_login_form = OpenidSigninForm(request.POST)
            if openid_login_form.is_valid():
                next = clean_next(openid_login_form.cleaned_data.get('next'))
                sreg_req = sreg.SRegRequest(optional=['fullname', 'nickname', 'email'])
                redirect_to = "%s%s?%s" % (
                        get_url_host(request),
                        reverse('auth_openid_login_complete'),
                        urllib.urlencode({'next': next}))

                return ask_openid(request,
                        openid_login_form.cleaned_data['openid_url'],
                        redirect_to,
                        on_failure=openid_login_failure,
                        sreg_request=sreg_req)
            else:
                return render_login_form(request, '/', message='Invalid OpenID login form.')

        else:
            #normal login
            username = request.POST.get('username', None)
            password = request.POST.get('password', None)

        remember_me = request.POST.get('remember', None)
        if remember_me and smart_str(remember_me) != 'on':
            return HttpResponseBadRequest('Invalid input parameters!')
        remember_me = (remember_me == 'on')

        is_ajax = request.is_ajax()
        if not is_ajax:
            goto_url = request.POST.get('goto', '/')

        if ((username is None) or (username.strip() == '')) or \
           ((password is None) or (password.strip() == '')):
            if is_ajax:
                data = {'success': True,
                        'data': {'name': 'Bad Login'}}
                return JSONResponse(data)
            else:
#                return render_to_response(template_name, {'goto_url': goto_url,
#                                                         'error_message': 'Both username and password are required.'})
                return render_login_form(request,
                                         goto_url,
                                         message='Both username and password are required.')

        user = auth.authenticate(username=smart_str(username), password=smart_str(password))
        if user is not None and user.is_active:
            login_failure = False
            request.session[settings.PERSISTENT_SESSION_KEY] = remember_me
            auth.login(request, user)

            #logging
            log.info('username=%s clientip=%s action=user_login', getattr(request.user, 'username', ''), request.META.get('REMOTE_ADDR', ''))

            if is_ajax:
                data = {'success': True,
                        'data': dict(username=user.username,
                                name=user.get_full_name(),
                                can_share=user.groups.filter(name='can_share').count() > 0,
                                #is_gnf_user=user.groups.filter(name='gnfusers').count()>0,
                                is_gnf_user=user.is_gnf_user,
                                is_nvs_user=user.is_nvs_user,
                                profile=user.profile)}
            else:
                return HttpResponseRedirectWithIEFix(request, goto_url)
        else:
            login_failure = True

        if login_failure:
            if is_ajax:
                data = {'success': True,
                        'data': {'name': 'Bad Login'}}
            else:
                if user is not None and not user.is_active:
                    #if username/password are correct, but user is not activated yet.
                    #show a more specific err msg below
                    msg = "Your user account has not been activated yet. Activate your account first using the link we sent to you via email."
                else:
                    msg = 'Please enter a correct username and password. Note that both fields are case-sensitive.'
                return render_login_form(request,
                                         goto_url,
                                         message=msg)
        if is_ajax:
            return JSONResponse(data)


def openid_login_complete(request):
    """ in case of complete signin with openid """
    return complete(request, openid_login_success, openid_login_failure,
            get_url_host(request) + reverse('auth_openid_login_complete'))


def openid_login_success(request, identity_url, openid_response):
    """
    openid signin success.

    If the openid is already registered, the user is redirected to
    url set par next or in settings with OPENID_REDIRECT_NEXT variable.
    If none of these urls are set user is redirected to /.

    if openid isn't registered, user is redirected to register page.
    """

    goto_url = clean_next(request.GET.get('next'))
    openid_ = from_openid_response(openid_response)
    request.session['openid'] = openid_
    try:
        rel = UserAssociation.objects.get(openid_url__exact=str(openid_))
    except:
        # try to register this new user
        return register_openid(request)
    user = rel.user

    if user and user.is_active:
        user.backend = "django.contrib.auth.backends.ModelBackend"
        auth.login(request, user)

        #logging
        log.info('username=%s clientip=%s action=user_login openid=1', getattr(request.user, 'username', ''), request.META.get('REMOTE_ADDR', ''))

        return HttpResponseRedirect(goto_url)
    else:
        return render_login_form(request,
                                 goto_url,
                                 message='User does not exist or inactive.')


def openid_login_failure(request, message):
    """
    falure with openid signin. Go back to signin page.
    """
    goto_url = clean_next(request.GET.get('next', None))
    return render_login_form(request, goto_url, message)


def logout(request):
    auth.logout(request)
    if request.is_ajax():
        return JSONResponse({'success': True})
    else:
        next_url = clean_next(request.GET.get('next', '/auth/login/'))
        return HttpResponseRedirect(next_url)


def forget_username(request, template='auth/forget_username_form.html',
                    errmsg_template='auth/forget_username_failure.txt',
                    send_email=True):
    if request.method == "POST":
        form = ForgetUsernameForm(request.POST)
        if form.is_valid():
            username_li = form.save()
            if len(username_li) > 0:
                email = form.cleaned_data['email']
                if send_email and email:
                    _send_email(email, subject_template='auth/forget_username_email_subject.txt',
                                     msg_template='auth/forget_username_email.txt',
                                     msg_context= {'username_li': username_li,
                                                   'email': email})

                return HttpResponseRedirect(reverse('auth_forget_username_done'))
            else:
                email = form.cleaned_data["email"]
                errmsg = render_to_string(errmsg_template, {'email': email})
                return biogpsError(errmsg)
    else:
        form = ForgetUsernameForm()
    return render_to_response(request, template, {'form': form})


def forget_username_done(request, template='auth/forget_username_done.html'):
    return render_to_response(request, template)


@loginrequired_or_redirect
def edit_userinfo(request, template='auth/userinfo_edit_form.html'):
    '''
    Modify user's account information
    Method: POST
    optional params: first_name, last_name, affiliation
    '''
    if request.method == "POST":
        form = EditUserInfoForm(request.POST, user=request.user)
        if form.is_valid():
            user = form.save()
            #update request.user
            request.user = user

            #log
            log.info('username=%s clientip=%s action=user_profileupdate fullname=%s %s affiliation=%s',
#                     form.cleaned_data.get('username', ''),
                     user.username,
                     request.META.get('REMOTE_ADDR', ''),
#                     form.cleaned_data.get('email', ''),
                     form.cleaned_data.get('first_name', ''),
                     form.cleaned_data.get('last_name', ''),
                     form.cleaned_data.get('affiliation', ''),
                     )

            return HttpResponseRedirect(reverse('auth_userinfo_edit_done'))
    else:
        form = EditUserInfoForm({'first_name': request.user.first_name,
                                 'last_name': request.user.last_name,
                                 'affiliation': request.user.affiliation}, user=request.user)
    return render_to_response(request, template, {'form': form})


def edit_userinfo_done(request, template_name='auth/userinfo_edit_done.html'):
    return render_to_response(request, template_name)


@openidrequired
@loginrequired_or_redirect
def changeopenid(request, template='auth/changeopenid.html'):
    """
    change openid view. Allow user to change openid
    associated to its username.

    url : /auth/account/openid/

    template: auth/changeopenid.html
    """

    extension_args = {}
    openid_url = ''
    has_openid = True
    msg = request.GET.get('msg', '')

    user_ = request.user

    try:
        uopenid = UserAssociation.objects.get(user=user_)
        openid_url = uopenid.openid_url
    except:
        has_openid = False

    redirect_to = get_url_host(request) + reverse('auth_change_openid')
    if request.POST and has_openid:
        form = ChangeopenidForm(request.POST, user=user_)
        if form.is_valid():
            return ask_openid(request, form.cleaned_data['openid_url'],
                    redirect_to, on_failure=changeopenid_failure)
    elif not request.POST and has_openid:
        if 'openid.mode' in request.GET:
            return complete(request, changeopenid_success,
                    changeopenid_failure, redirect_to)

    form = ChangeopenidForm(initial={'openid_url': openid_url}, user=user_)
    return render_to_response(request,
                              template,
                              {'form': form,
                               'has_openid': has_openid,
                               'message': msg})


def changeopenid_success(request, identity_url, openid_response):
    openid_ = from_openid_response(openid_response)
    is_exist = True
    try:
        uassoc = UserAssociation.objects.get(openid_url__exact=identity_url)
    except:
        is_exist = False

    if not is_exist:
        try:
            uassoc = UserAssociation.objects.get(
                    user__username__exact=request.user.username)
            uassoc.openid_url = identity_url
            uassoc.save()
        except:
            uassoc = UserAssociation(user=request.user,
                    openid_url=identity_url)
            uassoc.save()
    elif uassoc.user.username != request.user.username:
        return changeopenid_failure(request,
                'This OpenID is already associated with another account.')

    request.session['openids'] = []
    request.session['openids'].append(openid_)

    msg = "OpenID %s is now associated with your account." % identity_url
    redirect = "%s?msg=%s" % (
            reverse('auth_dashboard'),
            urlquote_plus(msg))
    return HttpResponseRedirect(redirect)


def changeopenid_failure(request, message):
    redirect_to = "%s?msg=%s" % (
            reverse('auth_change_openid'),
            urlquote_plus(message))
    return HttpResponseRedirect(redirect_to)


def removeopenid(request):
    redirect_to = None
    if request.method == "POST":
        # Delete association with openid
        uassoc = UserAssociation.objects.filter(user=request.user.id)[0]
        uassoc.delete()

        request.user.groups.remove(Group.objects.filter(name='openid')[0])
        message = "The OpenID association has been removed from your account."

        redirect_to = "%s?msg=%s" % (
                reverse('auth_dashboard'),
                urlquote_plus(message))
    else:
        redirect_to = reverse('auth_change_openid')

    return HttpResponseRedirect(redirect_to)


def getuserdata(request):
    user = getattr(request, 'user', None)
    if user and user.is_authenticated() and user.is_active:
        userdata = dict(username=user.username,
                        firstname=user.first_name,
                        lastname=user.last_name,
                        name=user.get_full_name(),
                        can_share=user.groups.filter(name='can_share').count() > 0,
                        is_gnf_user=user.is_gnf_user,
                        is_nvs_user=user.is_nvs_user,
                        profile=user.uiprofile)
    else:
        userdata = {}

    return JSONResponse(userdata)


@allowedrequestmethod('POST')
@loginrequired
def save_uiprofile(request):
    '''save user's uiprofile.
       accepts POST parameter "userprofile" for a json string.
    '''
    userprofile = request.POST.get('userprofile', None)
    if userprofile:
        try:
            userprofile = json.loads(userprofile)
        except ValueError:
            return HttpResponseBadRequest('Input data cannot be decoded.')
        try:
            request.user.save_uiprofile(userprofile)
        except UserProfile.DoesNotExist:
            return HttpResponseBadRequest('Can not save user profile.')

        json_response = json.dumps({'success': True})
        return HttpResponse(json_response, content_type='application/json')
    else:
        return HttpResponseBadRequest('Missing required parameter.')


#@render_to('account/password_reset.html')
@render_to('auth/password_reset_request_form.html')
def password_reset(request):
    ''' A modified version of password_reset view from account.views.
        Can be removed once we get emails in the user table unique.
    '''

    form_class=PasswordResetForm

    if 'POST' == request.method:
        form = form_class(request.POST)
    else:
        form = form_class()

    if form.is_valid():
        #user = UserModel.objects.get(email=form.cleaned_data['email'])
        username = form.cleaned_data['username']
        email = form.cleaned_data['email']
        hostname = Site.objects.get_current().domain
        user = User.objects.get(username__in=expanded_username_list(username.lower()), email=email)
        url = 'http://%s%s' % (hostname, reverse('auth_password_change'))
        url = wrap_url(url, uid=user.id, onetime=False, action='password_change')
        args = {'domain': hostname, 'url': url, 'user': user}
        if email_template(user.email, 'account/mail/password_reset', **args):
            #return message(request, 'Check the mail please')
            return render_to_response(request, 'auth/password_reset_request_done.html')
        else:
            return message(request, 'Unfortunately we could not send you email in current time. Please, try later')

    return {'form': form,
            }


@render_to('account/password_change.html')
def password_change(request):
    """
    A modified version of password_reset view from account.views.
    (to add the check for openid only user)

    That view is used in two cases:
     * User is authenticated. He fills the from with old password new one.
     * User follow the link from reset password email. In that case field for old password is invisible.
    """

    authkey = None
    if hasattr(request, 'authkey'):
        if request.authkey.extra.get('action') == 'password_change':
            authkey = request.authkey

    if not request.user.is_authenticated():
        if not authkey:
            return HttpResponseRedirect(reverse('auth_login') + '?next=%s' % request.path)

    if authkey:
        require_old = False
        initial = {'authkey': authkey.id, 'uid': authkey.uid}
    else:
        if request.user.is_openid_only():
            require_old = False
            initial = {'uid': request.user.id}
        else:
            require_old = True
            initial = {}

    if 'POST' == request.method:
        form = ChangePasswordForm(request.POST, require_old=require_old, user=request.user)
    else:
        form = ChangePasswordForm(require_old=require_old, initial=initial, user=request.user)

    if form.is_valid():
        form.save()
        if authkey:
            authkey.delete()
        return HttpResponseRedirect(reverse('auth_password_change_done'))

    return {'form': form,
            }
