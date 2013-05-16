#!/usr/bin/env python
import sys,os
if len(sys.argv)>1 and sys.argv[1].startswith(':'):
    port = sys.argv[1].strip()
else:
    port = ':8000'
cmdline = 'python manage.py runserver_plus --settings=settings_dev_local 0.0.0.0%s' % port
print cmdline
os.system(cmdline)