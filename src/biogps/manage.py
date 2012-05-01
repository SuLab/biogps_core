#!/usr/bin/env python
from add_path import *
from django.core.management import execute_manager, LaxOptionParser
from django.core.management.base import BaseCommand


def get_settings_dev_module():
    '''Use various ways to determine the default settings_dev to load.
            1. read from alt_settings_dev_cfgfile
            2. read from global environmental variable BIOGPS_SETTINGS_DEV
            3. use the default "settings_dev" module
       '''
    ALT_SETTINGS_DEV_CFGFILE = 'alt_settings_dev.txt'
    SETTINGS_DEV_ENV_VARIABLE = 'BIOGPS_SETTINGS_DEV'

    if os.path.exists(ALT_SETTINGS_DEV_CFGFILE):
        # 1. read from ALT_SETTINGS_DEV_CFGFILE
        settings_dev_file = file(ALT_SETTINGS_DEV_CFGFILE).read().strip()
        if not os.path.exists(settings_dev_file):
            raise IOError('Error: cannot find Django settings file: "%s" ' +
                          '(read from "%s")' % (settings_dev_file,
                                          ALT_SETTINGS_DEV_CFGFILE))
    elif SETTINGS_DEV_ENV_VARIABLE in os.environ:
        # 2. read from global environmental variable BIOGPS_SETTINGS_DEV
        settings_dev_file = os.environ[SETTINGS_DEV_ENV_VARIABLE].strip()
        if not os.path.exists(settings_dev_file):
            raise IOError('Error: cannot find Django settings file: "%s" ' +
                          '(read from "%s" environmental variable)' % \
                          (settings_dev_file, SETTINGS_DEV_ENV_VARIABLE))
    else:
        # 3. use the default "settings_dev.py" name
        settings_dev_file = 'settings_dev.py'
        if not os.path.exists(settings_dev_file):
            raise IOError('Error: cannot find Django settings file: "%s"' %
                          settings_dev_file)

    #remove file extension and return it as module name
    settings_dev_module = os.path.splitext(settings_dev_file)[0]
    return settings_dev_module

#Check command line argument to see if a custom settings is specified
parser = LaxOptionParser(option_list=BaseCommand.option_list)
options, args = parser.parse_args(sys.argv)
if options.settings:
    settings_mod = options.settings
else:
    # if not specified from command line, use the default settings_mod
    settings_mod = get_settings_dev_module()

try:
    #import settings # Assumed to be in the same directory
    settings = __import__(settings_mod)
except ImportError:
    import sys
    sys.stderr.write("Error: Can't find the file 'settings.py' in the directory containing %r. It appears you've customized things.\nYou'll have to run django-admin.py, passing it your settings module.\n(If the file settings.py does indeed exist, it's causing an ImportError somehow.)\n" % __file__)
    sys.exit(1)


if __name__ == "__main__":
    if options.verbosity != '0':
        print 'settings loaded from "%s"' % settings_mod
    execute_manager(settings)
