# Django settings for biogps project.
# This is the settings for external_prod server

from settings_base import *

######BioGPS specific settings#########
RELEASE_MODE = 'prod'   #available values: dev, prod, maintenance
#RELEASE_MODE = 'maintenance'   # uncomment this line to trigger maintenance mode

##URL for ElastisSearch backed Gene query service provider
BOESERVICE_URL= 'http://xx.xx.xx.xx'


##ElasticSearch server settings
ES_HOST = ['xx.xx.xx.xx:9500']
ES_INDEXES = {'default': 'biogps',
             'dataset': 'biogps_dataset'}

WITH_HTTPS = True  # True if https is allowed, set to False if not, e.g., running from a dev_server
#######################################

DEBUG = False
TEMPLATE_DEBUG = DEBUG
SITE_ID = 1


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.xxx',
        'NAME': '<name>',
        'USER': '<usr>',
        'PASSWORD': '<pwd>',
        'HOST': '<host>',
        'PORT': '',
    }
}

#Disable auto compression for django-compress app
COMPRESS_AUTO = False
COMPRESS_VERSION = False
