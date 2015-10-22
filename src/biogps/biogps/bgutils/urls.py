from django.conf.urls import url

from biogps.bgutils import views


urlpatterns = [
    # Example:
    # url(r'^biogps/', include('biogps.foo.urls')),
    url(r'^proxy', views.proxy),
    url(r'^errorreport/(?P<errorreport_id>.+)/', views.errorreport),
    url(r'^showchart/$', views.showchart),
    url(r'^feedbox/$', views.feedbox),
    url(r'^d9d7fd01be668950e3ea61c574e8eca9/$', views.set_domain_cookie),
    # url(r'^getform', views.getform),
]
