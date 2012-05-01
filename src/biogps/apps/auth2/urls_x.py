'''
The URLs listed here are served under /authx/ as ajax services via http.
'''
from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.apps.auth2.views',

                       url(r'^logout/$',
                           'logout',
                           name='auth_logout_x'),
                       url(r'^getuserdata$',
                           'getuserdata',
                           name='auth_getuserdata'),
                       url(r'^saveprofile$',
                           'save_uiprofile',
                           name='auth_saveprofile'),
                       )
