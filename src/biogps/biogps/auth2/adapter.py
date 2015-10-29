from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

from django.contrib.auth import get_user_model
from django.core.urlresolvers import reverse

from biogps.auth2.models import (
    UserProfile, DEFAULT_UIPROFILE, ROLE_BIOGPSUSER,
)


class BiogpsAccountAdapter(DefaultAccountAdapter):
    def new_user(self, request):
        user = get_user_model()()
        user.is_active = False
        return user

    def get_login_redirect_url(self, request):
        assert request.user.is_authenticated()
        url = reverse('mainpage')
        return url


class BiogpsSocialAccountAdapter(DefaultSocialAccountAdapter):
    def new_user(self, request, sociallogin):
        user = get_user_model()()
        return user

    def get_connect_redirect_url(self, request, socialaccount):
        assert request.user.is_authenticated()
        url = reverse('mainpage')
        return url

    def save_user(self, request, sociallogin, form=None):
        user = super(BiogpsSocialAccountAdapter, self).save_user(
            request, sociallogin, form)

        profile = UserProfile.objects.filter(user=user).first()

        if not profile:
            sid_prefix = user.username if user.username else str(user.id)
            UserProfile.objects.create(
                user=user,
                roles=ROLE_BIOGPSUSER,
                uiprofile=DEFAULT_UIPROFILE,
                sid=sid_prefix + '_sid',
            )

        return user
