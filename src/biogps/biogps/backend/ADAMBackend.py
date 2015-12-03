'''
This backend is deprecated, not being used by any other modules. It's left here for reference.
'''
from django.conf import settings
from django.contrib.auth.models import User, Group
from django.db import connection

from biogps.adamauth.adamadapter import ADAMService, ROLE_SEPARATOR, ROLE_GNFUSER, ROLE_NVSUSER
from biogps.adamauth.models import UserProfile
from biogps.adamauth.models import _extend_user

class ADAMBackend(object):
    """
    Authenticate against Adam server via SL
    """
    def __init__(self):
        self.adamsrv = ADAMService()

    def authenticate(self, username=None, password=None, sessionid=None, openid=False):

            adamuser = self.adamsrv.authenticate(username, password, sessionid)
            if adamuser:
                new_user_flag = False
                try:
                    user = UserProfile.objects.get(sid__exact=adamuser.sid).user
                except  UserProfile.DoesNotExist:
                    try:
                        user = User.objects.get(username__exact=adamuser.username)
                    except  User.DoesNotExist:
                        user = User(username=adamuser.username)
                        new_user_flag = True
                if user is not None:
                    #warn if username in User table is not the same as the one returned from ADAM
                    #if (user.username != adamuser.username):
                    if (user.username != adamuser.username) and not adamuser.username.startswith(user.username):
                        if settings.DEBUG:
                            errmsg =  'Warning: ambiguous username: \n' + \
                                      'sid: %s\nusername (Django): %s\nusername (ADAM): %s' % (adamuser.sid, user.username, adamuser.username)
                            raise ValueError, errmsg
                        else:
                            from django.core.mail import mail_admins
                            subject = 'Warning: ambiguous username'
                            message = 'sid: %s\nusername (Django): %s\nusername (ADAM): %s' % (adamuser.sid, user.username, adamuser.username)
                            mail_admins(subject, message, fail_silently=True)
                    if password and not openid and password != settings.SL_PIN:
                        user.set_password(password)
                    self._update_user(adamuser, user, openid, is_newuser=new_user_flag)
                return user

    def _update_user(self, adamuser, user, openid=False, is_newuser=False):
        """
        Helper method, populates a user object with various attributes from
        ADAMUser object after parsing returned ADAM content.
        """
#        user.set_unusable_password()

        if (user.username != adamuser.username) and adamuser.username.startswith(user.username):
            #in this case, need to update existing username to its "fully-qualified username",
            #which applies only to gnf users and novartis users.
            #This piece of code can be removed after all existing usernames are updated.
            user.username = adamuser.username

        #required field for auth.User object
        user.first_name = adamuser.first_name
        user.last_name = adamuser.last_name
        user.email = adamuser.email
        user.is_active = adamuser.is_active

        user.save()

        try:
            userprofile=user.profile
        except UserProfile.DoesNotExist:
            userprofile = UserProfile(user_id = user.id)

        #update userprofile
        userprofile.sid = adamuser.sid
        userprofile.affiliation = adamuser.affiliation
        userprofile.roles = ROLE_SEPARATOR.join(adamuser.roles)
        userprofile.get_uiprofile_or_create()
        userprofile.save()

        ##extra fields
        #user.sid = userprofile.sid
        #user.affiliation = userprofile.affiliation
        #user.roles = adamuser.roles
        #user.profile = userprofile.uiprofile
        _extend_user(user)

        #assign groups and permissions
        if openid:
            user.add_group_by_name('openid')
        else:
            # Everyone that comes in here gets assigned to the 'adam' group.
            user.add_group_by_name('adam')
        if ROLE_GNFUSER in user.roles:
            user.add_group_by_name('gnfusers')
            user.add_group_by_name('can_share')
        if ROLE_NVSUSER in user.roles:
            user.add_group_by_name('nvsusers')
            user.add_group_by_name('can_share')
        elif (user.first_name and user.last_name and user.affiliation):
            user.add_group_by_name('can_share')

        #connect new user to inviter if an valid invitationkey is available
        if is_newuser and adamuser.invitationkey:
            from friends.models import JoinInvitation
            try:
                join_invitation = JoinInvitation.objects.get(confirmation_key = adamuser.invitationkey)
                join_invitation.accept(user)
            except JoinInvitation.DoesNotExist:
                pass





        if settings.DEBUG:
            user.adamraw = adamuser.adamraw

    # Required for an authentication backend
    def get_user(self, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist: #IGNORE:E1101
            return None

        if self.adamsrv.is_user_active(user.username):
            return user
        else:
            return None

    def get_group_permissions(self, user_obj):
        """
        Returns a set of permission strings that this user has through his/her
        groups.
        """
        if not hasattr(user_obj, '_group_perm_cache'):
            cursor = connection.cursor()
            # The SQL below works out to the following, after DB quoting:
            # cursor.execute("""
            #     SELECT ct."app_label", p."codename"
            #     FROM "auth_permission" p, "auth_group_permissions" gp, "auth_user_groups" ug, "django_content_type" ct
            #     WHERE p."id" = gp."permission_id"
            #         AND gp."group_id" = ug."group_id"
            #         AND ct."id" = p."content_type_id"
            #         AND ug."user_id" = %s, [self.id])
            qn = connection.ops.quote_name
            sql = """
                SELECT ct.%s, p.%s
                FROM %s p, %s gp, %s ug, %s ct
                WHERE p.%s = gp.%s
                    AND gp.%s = ug.%s
                    AND ct.%s = p.%s
                    AND ug.%s = %%s""" % (
                qn('app_label'), qn('codename'),
                qn('auth_permission'), qn('auth_group_permissions'),
                qn('auth_user_groups'), qn('django_content_type'),
                qn('id'), qn('permission_id'),
                qn('group_id'), qn('group_id'),
                qn('id'), qn('content_type_id'),
                qn('user_id'),)
            cursor.execute(sql, [user_obj.id])
            user_obj._group_perm_cache = set(["%s.%s" % (row[0], row[1]) for row in cursor.fetchall()])
        return user_obj._group_perm_cache

    def get_all_permissions(self, user_obj):
        if not hasattr(user_obj, '_perm_cache'):
            user_obj._perm_cache = set([u"%s.%s" % (p.content_type.app_label, p.codename) for p in user_obj.user_permissions.select_related()])
            user_obj._perm_cache.update(self.get_group_permissions(user_obj))
        return user_obj._perm_cache

    def has_perm(self, user_obj, perm):
        return perm in self.get_all_permissions(user_obj)

    def has_module_perms(self, user_obj, app_label):
        """
        Returns True if user_obj has any permissions in the given app_label.
        """
        for perm in self.get_all_permissions(user_obj):
            if perm[:perm.index('.')] == app_label:
                return True
        return False
