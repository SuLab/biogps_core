# Django settings for biogps project.
# This is the settings for dev server

from settings_base import *

TEST_CASE = 1  # normal dev mode
#TEST_CASE = 2  # test with RELEASE_MODE ="prod" and DEBUG = False


######BioGPS specific settings#########
RELEASE_MODE = 'dev'   #or dev; prod; maintenance;

##URL for CouchDB backed Gene query service provider
#Deprecated using BOESERVICE_URL instead
#BOCSERVICE_URL = 'http://xx.xx.xx.xx'

##URL for ElastisSearch backed Gene query service provider
BOESERVICE_URL= 'http://xx.xx.xx.xx'


WITH_HTTPS = False  # True if https is allowed, set to False if not, e.g., running from a dev_server

USE_CACHES = False  # True to using Caching framework.

##ElasticSearch server settings
ES_HOST = ['xx.xx.xx.xx:9500']
ES_INDEXES = {'default': 'biogps',
              'dataset': 'biogps_dataset'}

#######################################

DEBUG = True
DB_SCHEMA = 'biogpsd'   # 1: sqlite; 2: biogpsd; 3 biogpsp
SERVE_ASSETS = 1
SITE_ID = 1
SHOWDEBUGTOOLBAR = 0

if TEST_CASE == 2:
    RELEASE_MODE = 'prod'
    DEBUG = False

DATABASES = {

    'biogpsd': {
        'ENGINE': 'django.db.backends.xxx',
        'NAME': '<name>',
        'USER': '<usr>',
        'PASSWORD': '<pwd>',
        'HOST': '<host>',
        'PORT': '',
    },

    'biogpsp': {
        'ENGINE': 'django.db.backends.xxx',
        'NAME': '<name>',
        'USER': '<usr>',
        'PASSWORD': '<pwd>',
        'HOST': '<host>',
        'PORT': '',
    },

    'sqlite': {
        'NAME': os.path.join(ROOT_PATH, 'sqlite/db'),
        'ENGINE': 'django.db.backends.sqlite3',
    },

}
DATABASES['default'] = DATABASES[DB_SCHEMA]

MIDDLEWARE_CLASSES = list(MIDDLEWARE_CLASSES)

if DEBUG:
    INTERNAL_IPS += ('127.0.0.1',)

if DEBUG and SHOWDEBUGTOOLBAR:
    MIDDLEWARE_CLASSES.append('debug_toolbar.middleware.DebugToolbarMiddleware')
    INSTALLED_APPS += ('debug_toolbar',)
    DEBUG_TOOLBAR_CONFIG = dict(INTERCEPT_REDIRECTS=False)

DEBUG_TOOLBAR_PANELS = (
    'debug_toolbar.panels.version.VersionDebugPanel',
    'debug_toolbar.panels.timer.TimerDebugPanel',
    'debug_toolbar.panels.settings_vars.SettingsVarsDebugPanel',
    'debug_toolbar.panels.headers.HeaderDebugPanel',
    'debug_toolbar.panels.request_vars.RequestVarsDebugPanel',
    'debug_toolbar.panels.template.TemplateDebugPanel',
    'debug_toolbar.panels.sql.SQLDebugPanel',
    'debug_toolbar.panels.cache.CacheDebugPanel',
    'debug_toolbar.panels.signals.SignalDebugPanel',
    'debug_toolbar.panels.logger.LoggingPanel',
)


TEST_RUNNER='biogps.test.nose_runner.run_tests'
NOSE_ARGS = ['--exe']

INSTALLED_APPS += (
    'south',
)

#EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'
#COMPRESS = True
#COMPRESS_AUTO = False

# Django settings for adding caching support.

if USE_CACHES:
    # Django settings for adding caching support.

    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.memcached.PyLibMCCache',
            'LOCATION': '127.0.0.1:11211',
            'OPTIONS': {"tcp_nodelay": True, "ketama": True},
        },

        'uwsgi': {
           'BACKEND': 'uwsgi_cache.CacheClass',
           'LOCATION': "uwsgicache://",
        },

        'dummy': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

    #CACHES['default'] = CACHES['uwsgi']
    #CACHES['default'] = CACHES['dummy']


    MIDDLEWARE_CLASSES = list(MIDDLEWARE_CLASSES)
    MIDDLEWARE_CLASSES = ['django.middleware.cache.UpdateCacheMiddleware'] + MIDDLEWARE_CLASSES + \
                         ['django.middleware.cache.FetchFromCacheMiddleware']

    CACHE_MIDDLEWARE_SECONDS=300
    CACHE_MIDDLEWARE_KEY_PREFIX='biogps'

    INSTALLED_APPS += (
        'memcache_status',
    )

# host that provide dataset service
DATASET_SERVICE_HOST = 'http://xx.xxx.xxx.xxx'
