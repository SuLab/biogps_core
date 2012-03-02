import os, os.path, sys
root_dir = os.path.abspath(os.path.dirname(__file__))
src_dir = os.path.join(root_dir, 'src')
sys.path.append(src_dir)
from biogps.add_path import *


os.environ['DJANGO_SETTINGS_MODULE'] = os.environ.get('BIOGPS_DJANGO_SETTINGS', 'biogps.settings_prod')
#os.environ['DJANGO_SETTINGS_MODULE'] = 'biogps.settings_dev'

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()
