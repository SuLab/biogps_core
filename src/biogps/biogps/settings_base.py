# Django settings for biogps project.
# This file contains common settings for two specific settings files:
#         settings_dev.py         (for dev server)
#         settings_prod.py        (for prod server)
#
import os.path

######BioGPS specific settings#########
ROOT_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

##Get the current version info
import subprocess, os
cwd = os.getcwd()
os.chdir(ROOT_PATH)
hg_cmd = "hg log -r tip --template {latesttag}.{latesttagdistance}-{node|short}"
BIOGPS_VERSION = subprocess.check_output(hg_cmd.split())
os.chdir(cwd)

try:
    import uwsgi
    USE_UWSGI = True
except ImportError:
    USE_UWSGI = False

# HTTPLIB2_CACHE = '.cache'            #the path for cached http request used by httplib2. Set to 0 or False to disable it.
HTTPLIB2_CACHE = False


# Caching with memcached
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyLibMCCache',
        'LOCATION': '127.0.0.1:11211',
    }
}

# Cache times in seconds
CACHE_DAY = 86400
CACHE_WEEK = 604800


BOT_HTTP_USER_AGENT = ('Googlebot', 'msnbot', 'Yahoo! Slurp')    #The string appearing in HTTP_USER_AGENT header to indicate it is from a web crawler.

# Used in middleware/maintenance.py
MAINTENANCE_PAGE = os.path.join(ROOT_PATH, 'biogps', 'assets', 'maintenance.html')

#used in user_tags.py of biogps.app.friends
ACCOUNT_USER_DISPLAY = lambda u: u.get_full_name() or u.username

##ElasticSearch settings
#ES_HOST = ['localhost:9500']   # this is defined in settings_dev.py or settings_prod.py files.
ES_INDEX_NAME = 'biogps'
ES_AVAILABLE_TYPES = {'gene':    {
                                  #The default facets for a specific type
                                  'facets':['_type', 'species'],
                                 },
                      'plugin':  {
                                 'facets':['_type', 'species', 'tag'],
                                 },
                      'layout':  {
                                 'facets':['_type', 'species', 'tag'],
                                 },
                      'genelist':{
                                 'facets':['_type', 'species', 'tag'],
                                 },
                      'dataset':{
                                 'facets':['_type', 'species', 'tag'],
                                 'sort': '_id',
                                 },
                     }
ES_MAX_QUERY_LENGTH = 1000
SUSPEND_ES_UPDATE = False   #set to True if you want to suspend syncing ES index with BioGPS model objects, e.g. when running tests.


######Django specific settings#########
PERSISTENT_SESSION_KEY = 'sessionpersistent'     #used by 'biogps.middleware.DualSession.DualSessionMiddleware'
#SESSION_COOKIE_SECURE = True

AUTHENTICATION_BACKENDS = (
 'django.contrib.auth.backends.ModelBackend',
 'allauth.account.auth_backends.AuthenticationBackend',
)

LOGIN_URL = '/auth/login'

AUTH_PROFILE_MODULE = "auth2.UserProfile"

SITE_ID = 1

SERIALIZATION_MODULES = {
    'myjson': 'biogps.utils.jsonserializer',
    'jsonfix': 'biogps.utils.jsonserializer2',
    "extdirect" : "extdirect.django.serializer",
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be avilable on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Los_Angeles'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = False

USE_TZ = True

# Absolute path to the directory that holds media.
MEDIA_ROOT = os.path.join(ROOT_PATH, 'media')

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = '/media/'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(ROOT_PATH, 'biogps', 'biogps', 'templates'),
        ],
        'OPTIONS': {
            'context_processors': [
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.debug',
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.request',
                'biogps.utils.context_processors.base_processor',
            ],
            'loaders': [
                'django.template.loaders.filesystem.Loader',
                'biogps.utils.template.BiogpsLoader',
                'django.template.loaders.app_directories.Loader',
            ]
        },
    },
]

MIDDLEWARE_CLASSES = (
    'django.middleware.gzip.GZipMiddleware',
    'biogps.middleware.trimhtml.SpacelessMiddleware',
    'biogps.middleware.maintenance.MaintenanceMiddleware',
    'django.middleware.common.CommonMiddleware',
#    'django.middleware.csrf.CsrfViewMiddleware',
#    'django.middleware.csrf.CsrfResponseMiddleware',
    'biogps.middleware.csrf.CsrfViewMiddleware',
    'biogps.middleware.csrf.CsrfResponseMiddleware',

    #'django.contrib.sessions.middleware.SessionMiddleware',
    'biogps.middleware.DualSession.DualSessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.contrib.admindocs.middleware.XViewMiddleware',
    'django_authopenid.middleware.OpenIDMiddleware',
    'urlauth.middleware.AuthKeyMiddleware',
    'pagination.middleware.PaginationMiddleware',
    'breadcrumbs.middleware.BreadcrumbsMiddleware'
)

ROOT_URLCONF = 'biogps.urls'

WSGI_APPLICATION = 'biogps.wsgi.application'

INSTALLED_APPS = (
    #Django's buildin apps
    'django.contrib.auth',
    'django.contrib.admin',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'django.contrib.admindocs',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.sitemaps',
    'django_comments',

    #third-party apps
    'tagging',
    'flag',
    "pagination",
    "notification",
    "friends",
    "timezones",
    'threadedcomments',
    'pipeline',
    'django_extensions',
    'django_authopenid',
    'urlauth',
    'uwsgi_admin',

    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.openid',
    'allauth.socialaccount.providers.facebook',
    'allauth.socialaccount.providers.twitter',

    #our own biogps apps
    'biogps.www',
    'biogps.auth2',
    'biogps.dataset',
    'biogps.gene',
    'biogps.plugin',
    'biogps.layout',
    'biogps.genelist',
    'biogps.mobile',
    'biogps.ext_plugins',
    'biogps.bgutils',
    'biogps.bgprofile',
    'biogps.bgfriends',
    'biogps.comment',
    'biogps.rating',
    'biogps.favorite',
    'biogps.stat',
    'biogps.search',
)

ALLOWED_HOSTS = ['.biogps.org']

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = os.path.join(ROOT_PATH, 'assets')

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/assets/'

# Additional locations of static files
STATICFILES_DIRS = (
    os.path.join(ROOT_PATH, 'biogps', 'assets'),
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    # 'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

STATICFILES_STORAGE = 'pipeline.storage.PipelineCachedStorage'

# Make this unique, and don't share it with anybody.
SECRET_KEY = '*cp6weayxc%l908tl14len!t@w4ws*@j8*2s$$29h(rb55$791'

# Sensitive settings get imported here.
from settings_private import *

######Third-party Django Apps specific settings#########

## django_account
from urlauth.settings import *
ACCOUNT_REGISTRATION_ENABLED = True
ACCOUNT_ACTIVATION_REQUIRED = True
ACCOUNT_ADAPTER = 'biogps.auth2.adapter.BiogpsAccountAdapter'
SOCIALACCOUNT_ADAPTER = 'biogps.auth2.adapter.BiogpsSocialAccountAdapter'
ACCOUNT_EMAIL_REQUIRED = True
# SOCIALACCOUNT_EMAIL_VERIFICATION = 'mandatory'
SOCIALACCOUNT_AUTO_SIGNUP = False
SOCIALACCOUNT_PROVIDERS = {
    'openid': {
        'SERVERS': [
            {'id': 'yahoo',
             'name': 'Yahoo',
             'openid_url': 'http://me.yahoo.com'},
        ],
    },
    'google': {},
}

SOCIALACCOUNT_FORMS = {
    'signup': 'biogps.auth2.forms.SocialSignupForm'
}

## django_threadedcomments
COMMENTS_APP = 'threadedcomments'

## django_tagging
FORCE_LOWERCASE_TAGS = True
MAX_TAG_LENGTH = 50


##djagno_friends
#These two parameters are used by friends app to send out join request
SITE_NAME = 'BioGPS'   #used by friends app to send out join request
CONTACT_EMAIL = DEFAULT_FROM_EMAIL


## djagno_breadcrumbs
# used by breadcrumbs app to force the presence of the home link
BREADCRUMBS_AUTO_HOME = True

## djagno_compress
from settings_compress import *
