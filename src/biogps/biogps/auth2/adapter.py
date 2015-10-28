from allauth.account.adapter import DefaultAccountAdapter


class BiogpsAccountAdapter(DefaultAccountAdapter):
    def new_user(self, request):
        user = super(BiogpsAccountAdapter, self).new_user(request)
        user.is_active = False
        return user
