'''
This file keeps all sensitive settings for BioGPS app.

*****DO NOT COMMIT IT TO ANY REPOSITORY, ADD IT TO THE INGORED LIST*****
'''
######BioGPS specific settings#########

REMOTESERVICEERROR_EMAIL = (         # the email list for any remote service error.
     ('BioGPS_Notifications', '<biogps_admin_email>'),
)

# Specify the IP of plugins.biogps.org
# Used in middleware/maintenance.py
BIOGPS_PLUGIN_HOST = 'xxx.xx.xx.xx'

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
SECRET_KEY = '<secret_key>'

ADMINS = (
     ('BioGPS_Notifications', '<biogps_admin_email>'),
)
MANAGERS = ADMINS

INTERNAL_IPS = ADMINS_CLIENT

DEFAULT_FROM_EMAIL = '<biogps_default_email>'
SERVER_EMAIL = '<biogps_admin_email>'

EMAIL_SUBJECT_PREFIX = '[BioGPS-Admin] '


######Third-party Django Apps specific settings#########

#####################################################################
#  django_ses or the AWS key does not work any more since 09/2018   #
#  switch to use SES SMTP server on 09/10/2018                      #
#####################################################################

## django_ses for sending email via SES
# EMAIL_BACKEND = 'django_ses.SESBackend'
# AWS_ACCESS_KEY_ID = '<aws_access_key_id>'
# AWS_SECRET_ACCESS_KEY = '<aws_secret_access_key>'

EMAIL_BACKEND = 'django_smtp_ssl.SSLEmailBackend'
EMAIL_USE_TLS = True
EMAIL_HOST = '<smtp-server>'
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
EMAIL_PORT = 465

## Google ReCaptcha v3 settings
# https://developers.google.com/recaptcha/docs/v3
# https://developers.google.com/recaptcha/docs/verify
RECAPTCHA_PRIVATE_KEY = '<private_key>'
RECAPTCHA_PUBLIC_KEY = '<public_key>'
RECAPTCHA_API = 'https://www.google.com/recaptcha/api/siteverify'
RECAPTCHA_REQUIRED_SCORE = 0.85
