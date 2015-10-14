'''
The URLs listed here are served under /profile/
'''
from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.bgprofile.views',
    url(r'^$',
        'index',
        name='apps.bgprofile.mine'),
    
    url(r'^edit/$',
        'edit',
        name='apps.bgprofile.edit'),
    
    url(r'^(?P<userid>[\w-]+)/$',
        'view'),
    
    url(r'^(?P<userid>[\w-]+)/(?P<junk>.+)$',
        'view',
        name='apps.bgprofile.view'),
)
