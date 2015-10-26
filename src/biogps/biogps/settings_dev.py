from settings_base import *
 
 
######BioGPS specific settings#########
RELEASE_MODE = 'dev'   #available values: dev, prod, maintenance
#RELEASE_MODE = 'maintenance'   # uncomment this line to trigger maintenance mode
 
##URL for Gene query service provider
BOESERVICE_URL= 'http://mygene.info/v2'
 
WITH_HTTPS = False  # True if https is allowed, set to False if not, e.g., running from a dev_server
#######################################
 
DEBUG = True
SITE_ID = 1
SERVE_ASSETS = 1
 
SHOWDEBUGTOOLBAR = 0
 
 
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'biogpsd_dev',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'localhost',   # test_db_small
        'PORT': '5433',
    }
}
 
##ElasticSearch settings
ES_HOST = [DATABASES['default']['HOST'] + ':9200']
ES_INDEXES = {'default': 'biogps',
              'dataset': 'biogps_dataset'}
 
 
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

TEST_RUNNER = 'biogps.test.nose_runner.BiogpsTestSuiteRunner'
NOSE_ARGS = ['--exe']

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
CACHES['default'] = {
    'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
}
 
DATASET_SERVICE_HOST = 'http://ds.biogps.org'

import warnings
warnings.filterwarnings(
        'error', r"DateTimeField .* received a naive datetime",
        RuntimeWarning, r'django\.db\.models\.fields')
