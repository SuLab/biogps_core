from django.conf.urls.defaults import *
from biogps.extdirect import views

urlpatterns = patterns(
    '',
    (r'^remoting/router/$', views.remote_provider.router),
    (r'^remoting/provider.js/$', views.remote_provider.script),
    (r'^remoting/api/$', views.remote_provider.api),
    (r'^polling/router/$', views.polling_provider.router),
    (r'^polling/provider.js/$', views.polling_provider.script)
)
