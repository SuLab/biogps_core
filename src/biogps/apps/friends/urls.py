from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.apps.friends.views',
    url(r'^invite/$', 'invite_friend', name='invite_friend'),

    url(r'^$', 'friends', name='friends'),
    url(r'^contacts/$', 'contacts',  name='invitations_contacts'),
    url(r'^contacts_yahootest/$', 'contacts', {'includeyahoo': True}),
    url(r'^accept/(\w+)/$', 'accept_join', name='friends_accept_join'),
    #url(r'^invite_to_join/$', 'invite_to_join', name="invite_to_join"),

)