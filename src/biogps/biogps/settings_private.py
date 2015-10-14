'''
This file keeps all sensitive settings for BioGPS app.

*****DO NOT COMMIT IT TO ANY REPOSITORY, ADD IT TO THE INGORED LIST*****
'''
######BioGPS specific settings#########

REMOTESERVICEERROR_EMAIL = (         # the email list for any remote service error.
     ('BioGPS_Notifications', 'gustavo@netlandish.com'),
)

# Specify the IP of plugins.biogps.org
# Used in middleware/maintenance.py
BIOGPS_PLUGIN_HOST = 'localhost'

# Used in middleware/maintenance.py to bypass maintenance page for this IPs
ADMINS_CLIENT = (
    'xxx.xx.xx.xx',
    'xxx.xx.xx.xx',
    'xxx.xx.xx.xx',
)


# Google Analytics for Mobile
# Used in mobile/templatetags/ga_mobile.py
GA_MOBILE_PATH = '/m/ga/'
GA_MOBILE_ACCOUNT = 'UA-xxxxxx-x'


######Django specific settings#########

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'gusgus123gus1239998222aasdfAsdfh1T'

ADMINS = (
     ('BioGPS_Notifications', 'gustavo@netlandish.com'),
)
MANAGERS = ADMINS

INTERNAL_IPS = ADMINS_CLIENT

DEFAULT_FROM_EMAIL = 'gustavo@netlandish.com'
SERVER_EMAIL = 'gustavo@netlandish.com'

EMAIL_SUBJECT_PREFIX = '[BioGPS-Admin] '


######Third-party Django Apps specific settings#########

## djagno_friends
#  used by friends app to import yahoo contacts
#  get it from http://developer.yahoo.com/bbauth/appreg.html
BBAUTH_APP_ID = 'aaaa'
BBAUTH_SHARED_SECRET = 'bbbb'

## django_ses for sending email via SES
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_ACCESS_KEY_ID = 'aaaa'
AWS_SECRET_ACCESS_KEY = 'bbbb'
