import os
import os.path
import sys
src_dir = os.path.dirname(os.path.abspath(os.path.dirname(__file__)))
sys.path.append(src_dir)
from biogps.add_path import *

#os.environ['DJANGO_SETTINGS_MODULE'] = 'biogps.settings_dev'
os.environ['DJANGO_SETTINGS_MODULE'] = 'biogps.settings_prod'
from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()

if os.environ['DJANGO_SETTINGS_MODULE'] == 'biogps.settings_dev':
    try:
        from werkzeug import DebuggedApplication
        from django.views import debug

        def null_technical_500_response(request, exc_type, exc_value, tb):
            raise exc_type, exc_value, tb

        #need to disable django's default exception handler
        debug.technical_500_response = null_technical_500_response
        application = DebuggedApplication(application, evalex=True)
    except ImportError:
        pass
