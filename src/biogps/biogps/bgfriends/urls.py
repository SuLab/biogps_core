from django.conf.urls import url

from biogps.bgfriends import views


urlpatterns = [
    url(r'^invite/$', views.invite_friend, name='invite_friend'),

    url(r'^$', views.friends, name='friends'),
    url(r'^contacts/$', views.contacts,  name='invitations_contacts'),
    url(r'^contacts_yahootest/$', views.contacts, {'includeyahoo': True}),
    url(r'^accept/(\w+)/$', views.accept_join, name='friends_accept_join'),
    #url(r'^invite_to_join/$', views.invite_to_join, name="invite_to_join"),
]
