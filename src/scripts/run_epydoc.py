#!/usr/bin/env python
import os
import os.path
import sys
import subprocess
src_dir = os.path.dirname(os.path.abspath(os.path.dirname(__file__)))
project_root = os.path.dirname(src_dir)

os.environ['PYTHONPATH'] = '%s:%s:%s:%s' % (src_dir,
                                            os.path.join(project_root, 'site-packages'),
                                            os.path.join(project_root, 'site-packages/django_apps'),  
                                            os.environ['PYTHONPATH'])
os.environ['DJANGO_SETTINGS_MODULE'] = 'biogps.settings_dev'
os.chdir(src_dir)
p = subprocess.Popen("epydoc --config ./scripts/biogps_epydoc.ini %s" % (' '.join(sys.argv[1:])), shell=True)
sts = os.waitpid(p.pid, 0)
