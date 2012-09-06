#!/usr/bin/env python
import sys,os
if len(sys.argv)>1 and sys.argv[1].startswith(':'):
    port = sys.argv[1].strip()
else:
    port = ':8000'

# Change to the correct path, relative to the path of this script file
current_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.join(current_dir,'../biogps'))

# Start the local server
#cmdline = 'python manage.py runserver_plus --settings=settings_dev biogps-dev.gnf.org%s' % port
cmdline = 'python manage.py runserver_plus 0.0.0.0%s' % port
print cmdline
os.system(cmdline)