"""This is middleware displays a maintenance page for any request URL.
   triggered by settings.RELEASE_MODE=="maintenance".
   The return the content is read from /assets/maintenance.html.
"""
import os.path
from django.http import HttpResponse
from django.conf import settings

class MaintenanceMiddleware(object):
    def process_request(self, request):
        if getattr(settings,'RELEASE_MODE',None) == 'maintenance' and \
           not (request.META['REMOTE_ADDR'] in settings.ADMINS_CLIENT and request.META['HTTP_USER_AGENT'].lower().find('firefox')!=-1) and \
           not (request.META['REMOTE_ADDR'] == settings.BIOGPS_PLUGIN_HOST):
            msg_f = file(settings.MAINTENANCE_PAGE)
            msg = msg_f.read()
            msg_f.close()
            return HttpResponse(msg)