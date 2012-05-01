"""
To perform proper sys.path configuration
"""
import sys
import os.path

#current_dir should be <project_root>/src/biogps
current_dir = os.path.dirname(os.path.abspath(__file__))
#src_dir is one-level up
src_dir = os.path.dirname(current_dir)
#project_root is two-level up
project_root = os.path.dirname(src_dir)

#Add the path to src_dir and required general python modules and 3rd party
#django applications
#sys.path.extend([src_dir,
#                 os.path.join(project_root, 'site-packages'),
#                 os.path.join(project_root, 'site-packages/django_apps')])

##This two lines cause problem with modwsgi/apache environment.
##Do not use any *.egg modules, make them regular python modules.
##dependence of setuptools is problematic with modwsgi/apache environment
#import site
#site.addsitedir('./site-packages', set())

# Updates:
# By adding "python-eggs" parameter to "WSGIDaemonProcess" directive,
# we can use *.egg modules again with modwsgi/apache.
# Ref: http://code.google.com/p/modwsgi/wiki/ConfigurationDirectives#WSGIDaemonProcess
sys.path.append(src_dir)
import site
site.addsitedir(os.path.join(project_root, 'site-packages'), set())
