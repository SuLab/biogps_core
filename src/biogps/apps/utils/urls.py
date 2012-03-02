from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.apps.utils.views',
    # Example:
    # (r'^biogps/', include('biogps.foo.urls')),
     (r'^proxy', 'proxy'),
     (r'^errorreport/(?P<errorreport_id>.+)/', 'errorreport'),
     (r'^showchart/$', 'showchart'),
     (r'^feedbox/$', 'feedbox'),
     (r'^d9d7fd01be668950e3ea61c574e8eca9/$', 'set_domain_cookie'),
     #(r'^getform', 'getform'),
)
