"""
This code is modified based on:

http://code.basieproject.org/trunk/apps/django_nose/nose_runner.py

from

http://blog.jeffbalogh.org/post/57653515/nose-test-runner-for-django

Chunlei Wu 4:41 PM 6/12/2009
========================================================================
Django test runner that invokes nose.

Usage:
    ./manage.py test DJANGO_ARGS -- NOSE_ARGS

The 'test' argument, and any other args before '--', will not be passed
to nose, allowing django args and nose args to coexist.

You can use

    NOSE_ARGS = ['list', 'of', 'args']

in settings.py for arguments that you always want passed to nose.
========================================================================
Examples to run nose tests:
     devmgr.py test -- www.tests -vv
     devmgr.py test -- www.tests auth2.tests -vv
     devmgr.py test -- www.tests auth2.tests ext_plugins.tests -vv

     devmgr.py test -- www.tests:testGetGeneList -vv

    devmgr.py test -- www.tests -vv --newdb
    devmgr.py test -- www.tests -vv --newdb --nofixture


"""
import sys
import os.path
import shutil
import nose

from django.core.management import call_command
from django.test import utils
import django.db
connection = django.db.connection

from django.conf import settings

#settings.DATABASE_ENGINE = 'sqlite3'        #set DB to sqlite3, then test_db will be created as a in-memory sqlite DB.
##settings.DATABASE_NAME = os.path.join(settings.ROOT_PATH, 'sqlite/db')
#settings.DATABASE_NAME = os.path.join(settings.ROOT_PATH,'test/testdata/test_db')
#settings.DATABASE_USER = ''
#settings.DATABASE_PASSWORD = ''
#settings.DATABASE_HOST = ''
#settings.DATABASE_PORT = ''

#reload(django.db)            #so that new settings will be applied

#need to bypass csrf middleware in order for Django test Client works
#if 'csrf.middleware.CsrfMiddleware' in settings.MIDDLEWARE_CLASSES:
#    settings.MIDDLEWARE_CLASSES = list(settings.MIDDLEWARE_CLASSES)
#    settings.MIDDLEWARE_CLASSES.remove('csrf.middleware.CsrfMiddleware')


SETUP_ENV = 'setup_test_environment'
TEARDOWN_ENV = 'teardown_test_environment'

FIXTURES = ['./test/testdata/initial_data_for_unittest_0.xml',
            './test/testdata/initial_data_for_unittest_www.xml']

#TEST_SQLITE_DB = './test/testdata/clean_imported_db_08212009'
TEST_SQLITE_DB = './test/testdata/test_db_06222010'


def get_test_enviroment_functions():
    """The functions setup_test_environment and teardown_test_environment in
    <appname>.tests modules will be automatically called before and after
    running the tests.
    """
    setup_funcs = []
    teardown_funcs = []
    for app_name in settings.INSTALLED_APPS:
        mod = __import__(app_name, fromlist=['tests'])
        if hasattr(mod, 'tests'):
            if hasattr(mod.tests, SETUP_ENV):
                setup_funcs.append(getattr(mod.tests, SETUP_ENV))
            if hasattr(mod.tests, TEARDOWN_ENV):
                teardown_funcs.append(getattr(mod.tests, TEARDOWN_ENV))
    return setup_funcs, teardown_funcs


def setup_test_environment(setup_funcs):
    utils.setup_test_environment()
    settings.SUSPEND_ES_UPDATE = True
    for func in setup_funcs:
        func()


def teardown_test_environment(teardown_funcs):
    utils.teardown_test_environment()
    for func in teardown_funcs:
        func()


def run_tests(test_labels, verbosity=1, interactive=True, extra_tests=[]):
    setup_funcs, teardown_funcs = get_test_enviroment_functions()
    # Prepare django for testing.
    setup_test_environment(setup_funcs)

    extra_params = ['--newdb', '--nofixture']

    new_db = '--newdb' in sys.argv[1:]
    if new_db:
        #create a new in memory sqlite db with provided fixtures
        test_db = settings.DATABASE_NAME
        connection.creation.create_test_db(verbosity,
                                           autoclobber=not interactive)

        no_fixture = '--nofixture' in sys.argv[1:]
        if len(FIXTURES) > 0 and not no_fixture:
            call_command('loaddata', *FIXTURES, **{'verbosity': verbosity})
    else:
        #using existing sqlite db
        pass
#        test_db = os.path.join(settings.ROOT_PATH,'test/testdata/test_db')
#        if os.path.exists(test_db):
#            os.remove(test_db)
#        shutil.copy(TEST_SQLITE_DB, test_db)
#        settings.DATABASE_NAME = test_db

    settings_str = "\nUnit test for BioGPS application\n"
    for attr in ['ENGINE', 'NAME', 'HOST']:
        settings_str += '  DATABASE_%s:  %s\n' % (attr, settings.DATABASES['default'][attr])
    for attr in ['DEBUG', 'RELEASE_MODE', "BOCSERVICE_URL", "ES_HOST"]:
        settings_str += '  %s:  %s\n' % (attr, getattr(settings, attr))
    print settings_str

#    # Pretend it's a production environment.
#    settings.DEBUG = False

    nose_argv = ['nosetests']
    if hasattr(settings, 'NOSE_ARGS'):
        nose_argv.extend(settings.NOSE_ARGS)

    # Everything after '--' is passed to nose.
    if '--' in sys.argv:
        hyphen_pos = sys.argv.index('--')
        nose_argv.extend(sys.argv[hyphen_pos + 1:])
        for param in extra_params:
            if param in nose_argv:
                #remove this customized argument
                nose_argv.remove(param)

    print  ' '.join(nose_argv)

    nose.run(argv=nose_argv)

    # Clean up django.
    #connection.creation.destroy_test_db(test_db, verbosity)
    teardown_test_environment(teardown_funcs)
