'''
The URLs listed here are served under /auth/, via https only in prod.
'''
from django.conf.urls import patterns, url
from django.views.generic import TemplateView
from django.contrib.auth import views as auth_views


urlpatterns = patterns('biogps.auth2.views',
                       url(r'^$',
                           'dashboard',
                           name='auth_dashboard'),

                       url(r'^checkusername/(?P<username>\w+)/$',
                           'check_username',
                           name='auth_checkusername'),

                       # Registration
                       url(r'^signup/$', 'registration',
                           name='auth_register'),
                       url(r'^activation/required/$',
                           TemplateView.as_view(template_name='account/activation_required.html'),
                           name='activation_required'),
                       url(r'^signup/complete/$',
                           TemplateView.as_view(template_name='account/registration_complete.html'),
                           name='registration_complete'),

                       #openid registration
                       url(r'^openid_signup/$',
                           'register_openid',
                           {'template_name': 'auth/registration_form.html'},
                           name='auth_register_openid'),
                       url(r'^openid_login/complete$',
                           'openid_login_complete',
                           name='auth_openid_login_complete'),
                       #openid management
                       url(r'^openid/$',
                          'changeopenid',
                          name='auth_change_openid'),
                       url(r'^openid/remove/$',
                          'removeopenid',
                          name='auth_remove_openid'),


                       #login/logout
                       url(r'^login/$',
                           'login',
                           {'template_name': 'auth/login.html'},
                           name='auth_login'),
                       url(r'^logout/$',
                           'logout',
                           name='auth_logout'),

                       url(r'^forgotusername/$',
                           'forget_username',
                           name='auth_forget_username'),
                       url(r'^forgotusername/done/$',
                           'forget_username_done',
                           name='auth_forget_username_done'),

                       #account edit
                       url(r'^account/edit/$',
                           'edit_userinfo',
                           name='auth_userinfo_edit'),
                       url(r'^account/edit/done/$',
                           'edit_userinfo_done',
                           name='auth_userinfo_edit_done'),

                       #ajax requests
                       url(r'^getuserdata$',
                           'getuserdata',
                           name='auth_getuserdata'),
                       url(r'^saveprofile$',
                           'save_uiprofile',
                           name='auth_saveprofile'),

                        url(r'^password/reset/$', 'password_reset',
                            name='auth_password_reset'),
                        url(r'^password/change/$', 'password_change',
                            name='auth_password_change'),


                        )

urlpatterns += patterns('account.views',
#                        # Registration
#                        url(r'^signup/$', 'registration',
#                            name='auth_register'),
#                        url(r'^activation/required/$', direct_to_template,
#                            {'template':'account/activation_required.html'},
#                            name='activation_required'),
#                        url(r'^signup/complete/$', direct_to_template,
#                            {'template':'account/registration_complete.html'},
#                            name='registration_complete'),


                        # Password management
#                        url(r'^password/reset/$', 'password_reset',
#                            name='auth_password_reset'),
#                        url(r'^password/change/$', 'password_change',
#                            name='auth_password_change'),
                        url(r'^password/change/done/$', 'password_change_done',
                            name='auth_password_change_done'),

                        # Email management
                        url(r'^email/change/$', 'email_change', name='auth_email_change'),
                        url(r'^email/change/done/$', 'email_change_done',
                            name='auth_email_change_done'),

                        )
