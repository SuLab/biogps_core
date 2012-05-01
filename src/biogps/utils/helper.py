import os.path
import tempfile
import types
import datetime
import random
from functools import wraps

#from django.utils.encoding import smart_str, smart_unicode
#from django.utils.html import escape, strip_tags
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
#from django.template.loader import render_to_string
from django.http import Http404, HttpResponse, HttpResponseRedirect, HttpResponseBadRequest, HttpRequest
from django.conf import settings
from django.utils.http import urlquote
from django.contrib.sites.models import Site
#Load faster simplejson module if possible (/site-packages/simple-json)
#otherwise, fall back to Django's slower version
try:
    import simplejson as json
except:
    from django.utils import simplejson as json

from biogps.utils.decorators import not_authenticated

MAX_QUERY_LENGTH = 50*1000       #A rough upper limit for length of input gene query.

#MAX_QUERY_LENGTH = 50*10000

SPECIES_LIST = [ dict(name='human',
                      taxid=9606,
                      prefix='Hs',
                      assembly='hg19',
                      genus='Homo sapiens',
                      sample_gene=1017),    # CDK2
                 dict(name='mouse',
                      taxid=10090,
                      prefix='Mm',
                      assembly='mm9',
                      genus='Mus musculus',
                      sample_gene=12566),   # CDK2
                 dict(name='rat',
                      taxid=10116,
                      prefix='Rn',
                      assembly='rn4',
                      genus='Rattus norvegicus',
                      sample_gene=362817),  # CDK2
                 dict(name='fruitfly',
                      taxid=7227,
                      prefix='Dm',
                      assembly='dm3',
                      genus='Drosophila melanogaster',
                      sample_gene=42453),   # CDK2
                 dict(name='nematode',
                      taxid=6239,
                      prefix='Ce',
                      assembly='ce7',
                      genus='Caenorhabditis elegans',
                      sample_gene=172677),  # CDK8
                 dict(name='zebrafish',
                      taxid=7955,
                      prefix='Dr',
                      assembly='danRer6',
                      genus='Danio rerio',
                      sample_gene=406715),  # CDK2
                 dict(name='thale-cress',
                      taxid=3702,
                      prefix='At',
                      assembly='',          # we don't have genomic data for arabidopsis right now
                      genus='Arabidopsis thaliana',
                      sample_gene=837405),  # CSD1
                 dict(name='frog',
                      taxid=8364,
                      prefix='Xt',
                      assembly='xenTro2',
                      genus='Xenopus tropicalis',
                      sample_gene=493498),  # cdk2
                 dict(name='pig',
                      taxid=9823,
                      prefix='Ss',
                      assembly='susScr2',
                      genus='Sus scrofa',
                      sample_gene=100127490),  # CDK2
                ]

AVAILABLE_SPECIES = [s['name'] for s in SPECIES_LIST]
assembly_d = dict([(s['name'], s['assembly']) for s in SPECIES_LIST])
taxid_d = dict([(s['name'], s['taxid']) for s in SPECIES_LIST])
species_d = dict([(s['taxid'], s['name']) for s in SPECIES_LIST])
genus_d =  dict([(s['name'], s['genus']) for s in SPECIES_LIST])
sample_gene = dict([(s['name'], s['sample_gene']) for s in SPECIES_LIST])

#AVAILABLE_SPECIES = ['human', 'mouse', 'rat', 'drosophila', 'c. elegans', 'zebrafish', 'arabidopsis']
#
##assembly_d = {'human': 'GRCh37/hg19',
##              'mouse': 'NCBIM37/mm9',
##              'rat': 'RGSC3.4/rn4',
##              'drosophila': 'BDGP5.13/dm3',
##              'c. elegans': 'WS200/ce7',
##              'zebrafish':'Zv8/danRer6',
##              'arabidopsis':'',    #we don't have genomic data for arabidopsis right now
##              }
#
#assembly_d = {'human': 'hg19',
#              'mouse': 'mm9',
#              'rat': 'rn4',
#              'drosophila': 'dm3',
#              'c. elegans': 'ce7',
#              'zebrafish':'danRer6',
#              'arabidopsis':'',    #we don't have genomic data for arabidopsis right now
#              }
#
#
#taxid_d = {'human': 9606,
#           'mouse': 10090,
#           'rat': 10116,
#           'drosophila': 7227,
#           'c. elegans': 6239,
#           'zebrafish': 7955,
#           'arabidopsis': 3702,
#           }
#
#species_d = {9606: 'human',
#                   10090: 'mouse',
#                   10116: 'rat',
#                   7227: 'drosophila',
#                   6239: 'c. elegans',
#                   7955: 'zebrafish',
#                   3702: 'arabidopsis',
#                   }
#
#genus_d = {'human': 'Homo sapiens',
#           'mouse': 'Mus musculus',
#           'rat': 'Rattus norvegicus',
#           'drosophila': 'Drosophila melanogaster',
#           'c. elegans': 'Caenorhabditis elegans',
#           'zebrafish': 'Danio rerio',
#           'arabidopsis': 'Arabidopsis thaliana',
#           }
#
#sample_gene = {'human': 1017,  #'CDK2',
#               'mouse': 1017,
#               'rat': 1017,
#               'drosophila': 1017,
#               'c. elegans': 1024, #'CDK8',
#               'zebrafish': 1017,
#               'arabidopsis': 837405, #'CSD1'
#           }

GO_CATEGORY = {"MF": 'Molecular Function',
               "BP": 'Biological Process',
               "CC": 'Cellular Component'}

MIMETYPE = {'json': 'application/json',
            'myjson': 'application/json',
            'plainjson':'text/plain',
            'xml':'application/xml',
           }
STD_FORMAT = {'plainjson': 'json'}
#STD_FORMAT = {'plainjson': 'json',
#              'json':      'myjson'}

ROLEPERMISSION_VALUES = {'myself': None,
                     'gnfusers': 'GNF Users',
                     'novartisusers': 'Novartis Users',
                     'biogpsusers': 'BioGPS Users'}

ANONYMOUS_USER_ERROR = {'success': False,
                        'error': 'Login required for accessing this service. (It could be your session has expired. <a href="javascript:biogps.usrMgr.gotoLoginPage()">Click here to login again.)</a>'}
#EXT_VERSION = '2.1_svn'
#EXT_VERSION = '2.2'

def list2dict(list,keyitem,alwayslist=False):
    '''Return a dictionary with specified keyitem as key, others as values.
       keyitem can be an index or a sequence of indexes.
       For example: li=[['A','a',1],
                        ['B','a',2],
                        ['A','b',3]]
                    list2dict(li,0)---> {'A':[('a',1),('b',3)],
                                         'B':('a',2)}
       if alwayslist is True, values are always a list even there is only one item in it.
                    list2dict(li,0,True)---> {'A':[('a',1),('b',3)],
                                              'B':[('a',2),]}
    '''
    dict={}
    for x in list:
        if type(keyitem)==type(0):      #single item as key
            key=x[keyitem]
            value=tuple(x[:keyitem]+x[keyitem+1:])
        else:                           #
            key=tuple([x[i] for i in keyitem])
            value=tuple(sublist(x,keyitem,mode='-'))
        if len(value) == 1:      #single value
            value=value[0]
        if not dict.has_key(key):
            if alwayslist:
                dict[key] = [value,]
            else:
                dict[key]=value
        else:
            current_value=dict[key]
            if type(current_value) != type([]):
                current_value=[current_value,]
            current_value.append(value)
            dict[key]=current_value
    return dict

def sublist(list,idx,mode='+'):
    '''Return a sublist containing all elements with index specified in idx(a list of index) , if mode == '+'.
                                   all elements except those index sepecified in idx(a list of index) , if mode == '-'.
    '''
    if mode == '-':
        keepidx=range(len(list))
        for i in idx:
            keepidx.remove(i)
        return [list[i] for i in keepidx]
    else:
        return [list[i] for i in idx]

def list_nondup(list):
    x={}
    for item in list:
        x[item]=None
    return x.keys()

def ask(prompt,options='YN'):
    '''Prompt Yes or No,return the upper case 'Y' or 'N'.'''
    options=options.upper()
    while 1:
        s=raw_input(prompt+'[%s]' % '|'.join(list(options))).strip().upper()
        if s in options: break
    return s

class attrdict(dict):
    """A dict whose items can also be accessed as member variables.
        ref: http://code.activestate.com/recipes/361668/

    >>> d = attrdict(a=1, b=2)
    >>> d['c'] = 3
    >>> print d.a, d.b, d.c
    1 2 3
    >>> d.b = 10
    >>> print d['b']
    10

    # but be careful, it's easy to hide methods
    >>> print d.get('c')
    3
    >>> d['get'] = 4
    >>> print d.get('a')
    Traceback (most recent call last):
    TypeError: 'int' object is not callable

    """
    def __init__(self, *args, **kwargs):
        dict.__init__(self, *args, **kwargs)
        self.__dict__ = self

class dotdict(dict):
    def __getattr__(self, attr):
        value = self.get(attr, None)
        if type(value) is types.DictType:
            return dotdict(value)
        else:
            return value
    __setattr__= dict.__setitem__
    __delattr__= dict.__delitem__

def node_safeget(node, value, default=None):
    if node is None:
        return default
    else:
        return node.get(value)

## Decorators
def allowedrequestmethod(*allowedmethods):
    '''if used, will return an error for request.method not specified in allowedmethods argument.'''
    def decorator(fn):
        @wraps(fn)
        def check_method(*args, **kwargs):
            request = args[0]
            if request.method not in allowedmethods:
                return HttpResponseBadRequest('Unsupported request method "%s"' % request.method)
            else:
                return fn(*args, **kwargs)
        return check_method
    return decorator

def loginrequired(fn):
    '''if used, will return an error for annoymous user.'''
    @wraps(fn)
    def check_usr(*args, **kwargs):
        request = None;
        if len(args)>0 and isinstance(args[0], HttpRequest):
            request = args[0]
        elif len(args)>1 and isinstance(args[1], HttpRequest):
            request = args[1]
        if hasattr(request, 'user') and request.user.is_anonymous():
            return HttpResponse(json.dumps(ANONYMOUS_USER_ERROR), mimetype=MIMETYPE['json'])
        else:
            return fn(*args, **kwargs)
    return check_usr

def loginrequired_or_redirect(fn):
    '''if used, will redirect to login page for annoymous user.'''
    @wraps(fn)
    def check_usr(*args, **kwargs):
        request = args[0]
        if request.user.is_anonymous():
            login_url = settings.LOGIN_URL
            path = urlquote(request.get_full_path())
            return HttpResponseRedirect('%s?next=%s' % (login_url, path))
        else:
            return fn(*args, **kwargs)
    return check_usr

def openidrequired(fn):
    '''if used, will require an OpenID enabled account to access.
       Eg. the OpenID account editing page.
    '''
    @wraps(fn)
    def check_usr(*args, **kwargs):
        request = args[0]
        if request.user.is_authenticated() and not request.user.has_openid():
            errmsg = 'Your account must have OpenID enabled to access this page.'
            return biogpsError(errmsg, 'html')
        else:
            return fn(*args, **kwargs)
    return check_usr

def docenabled(fn):
    '''if used, the doc string will be displayed in /doc page'''
    fn.docenabled = True
    return fn

##End of decorators

def is_admin_ip(addr):
    '''Given an IP address as a string, returns true if it matches a known developer IP.
    This check is only secure enough for basic uses, like toggling a notice.  It should NOT
    be used for any kind of security.'''
    return addr in settings.INTERNAL_IPS

def is_gnf_email(email):
    return email.lower().find('@gnf.org') != -1

def is_nov_email(email):
    _email = email.lower()
    return _email.find('@novartis.com') != -1 or _email.find('@chiron.com') != -1

def getCommonDataForMain(request):
    if request.META.get('HTTP_HOST', '').startswith('ec2'):  #in case of dev site from ec2
        current_site = request.META['HTTP_HOST']           #This allows login form on main page, index_ext.html, work for biogps-stage/biogps-trunk server.
    else:
        current_site = Site.objects.get_current()
    user_type = request.user.account_type() if request.user.is_authenticated() else "Anonymous"
    with_https = getattr(settings, 'WITH_HTTPS', False)

    #available_species
    default_org = request.GET.get('org', 'human').lower()
    if default_org in AVAILABLE_SPECIES and default_org!=AVAILABLE_SPECIES[0]:
        idx = AVAILABLE_SPECIES.index(default_org)
        available_species = [default_org] + AVAILABLE_SPECIES[:idx]+AVAILABLE_SPECIES[idx+1:]
    else:
        available_species = AVAILABLE_SPECIES

    d = dict(#extver = EXT_VERSION,
             user_type = user_type,
             site=current_site,
             with_https=with_https,
             max_query_len = MAX_QUERY_LENGTH,
             available_species = json.dumps(available_species),
             sample_gene = json.dumps(sample_gene))

    return d

def mkErrorReport(err):
    errfile = tempfile.mktemp(prefix='biogps_error_report_', dir=os.path.join(settings.ROOT_PATH, ".tmp"))
    err_f = file(errfile, 'w')
    err_f.write(err)
    err_f.close()
    return os.path.split(errfile)[1]

def is_valid_geneid(value):
    #digits only (NCBI) or start with ENS
    #return (type(value) is not types.StringType) and (value.isdigit() or value.startswith('ENS') or value.startswith('FBgn')) and len(value)<30

    #Either an integer or a string shorter than 30 char
    return (type(value) is types.IntType) or (type(value) in types.StringTypes and len(value)<30)


def is_valid_parameter(value, maxlen=30):
    #allow digit, letter and hypen, understore
    import string
    return len(set(value) - set(string.ascii_letters+string.digits+'_-')) == 0 and len(value)<=maxlen

@allowedrequestmethod('GET')
def getObjectPermission(request, object_type, object_id):
    object_type = object_type.lower()
    import models
    if object_type in ['p', 'plugin']:
        _permission = models.BiogpsPlugin.objects.get(id=object_id).permission
    elif object_type == ['l', 'layout']:
        _permission = models.BiogpsGenereportLayout.objects.get(id=object_id).permission
    else:
        return HttpResponseBadRequest('unknown object_type.')
    if len(_permission) == 0:
        permission = None
    else:
        permission = list2dict([(obj['permission_type'], obj['permission_value']) for obj in _permission], 0, alwayslist=1)
    return HttpResponse(json.dumps(permission), mimetype=MIMETYPE['json'])


def setObjectPermission(object, roles=None, users=None, sep=','):
    '''
    A convenient function for set object role and user permissions.
       roles is a string for "shortcut" word defined in ROLEPERMISSION_VALUES,
               or can be multiple words seperated by sep.
                 e.g. 'myself', 'gnfusers, novartisusers'
               or can be special keywords:
                 'friendusers' or 'novartisusers'
            #TODO: need to expand to any role.

       users is a string with allowed usernames.
                 e.g. 'cwudemo', 'cwudemo1, cwuemo2'

            #TODO: need to check if user exists

       if both roles and users are None, existing permissions will be cleaned
    '''
    permissions = []
    if type(roles) in types.StringTypes:
        # Special handling for 'friends' since it's not really a role
        if roles.strip() == 'friendusers':
            permissions.append(dict(permission_type="F", permission_value=object.owner.username))
        else:
            # Special handling because 'novartisusers' implies both Novartis & GNF
            if roles.strip() == 'novartisusers':
                roles = 'gnfusers, novartisusers'

            for _rolepermission in roles.strip().split(','):
                rolepermission = ROLEPERMISSION_VALUES.get(_rolepermission.strip(), None)
                if rolepermission:
                    permissions.append(dict(permission_type="R", permission_value=rolepermission))

    if type(users) in types.StringTypes:
        for _user in users.strip().split(','):
            userpermission = _user.strip()
            if userpermission:
                permissions.append(dict(permission_type="U", permission_value=userpermission))
    if permissions:
        object.permission = permissions
    else:
        del object.permission

def cvtPermission(permission):
    '''    convert [{'R': 'GNF Users'}, {'U': 'cwu'}] into
            {'R': ['GNF Users'], 'U': ['cwu']}
    '''
    return list2dict([(x['permission_type'], x['permission_value']) for x in permission], 0, alwayslist=1)

def formatDateTime(o):
    '''Convert datatime object into a string representation as jsonserialier does.'''
    DATE_FORMAT = "%Y-%m-%d"
    TIME_FORMAT = "%H:%M:%S"
    if isinstance(o, datetime.datetime):
        return o.strftime("%s %s" % (DATE_FORMAT, TIME_FORMAT))

def ExtError(errmsg):
    '''Return a Json-ized dictionary favored by EXTJS with given errmsg.'''
    error = {'success': False,
             'error': errmsg}
    return HttpResponse(json.dumps(error), mimetype=MIMETYPE['json'])

def biogpsError(errmsg, format='html'):
    '''if formate is 'html', return a full html page for errmsg using biogps_error.html template;
       if format is 'json', returns a Json-ized dictionary favored by EXTJS with given errmsg.'''
    if format.lower() == 'json':
        return ExtError(errmsg)
    else:
        return render_to_response('biogps_error.html', {'title': 'Error', 'errmsg': errmsg})

def JSONResponse(pyobj):
    return HttpResponse(json.dumps(pyobj),
        content_type='application/json; charset=%s' % settings.DEFAULT_CHARSET)

def TextResponse(string='', **kwargs):
    return HttpResponse(string,
                        content_type='text/plain; charset=%s' % settings.DEFAULT_CHARSET,
                        **kwargs)

def XMLResponse(xmldata, **kwargs):
    return HttpResponse(xmldata,
                        content_type='text/xml; charset=%s' % settings.DEFAULT_CHARSET,
                        **kwargs)

def isRobot(request):
    '''return True if request's HTTP_USER_AGENT indicates it's from a specified web crawler.
       Possible string it looks for is defined in settings.BOT_HTTP_USER_AGENT.
    '''
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    for s in settings.BOT_HTTP_USER_AGENT:
        if user_agent.find(s) != -1:
            return True
    return False

def isIE(request):
    '''return True if request is from IE.'''
    return request.META.get('HTTP_USER_AGENT', '').find('MSIE') != -1

def HttpResponseRedirectWithIEFix(request, url):
    '''To fix an obscure IE bug when url contains hash string,
       Ref: http://www.michiknows.com/2007/06/06/ie-redirect-bug-with-dynamic-location-hash/
    '''
    if isIE(request):
        return HttpResponse('<script>document.location.href = "%s"</script>' % url)
    else:
        return HttpResponseRedirect(url)

def set_domain_cookie(request, response):
    '''This is to set a "gnf.org" domain cookie used by security-aware plugins.'''
    max_age = settings.SESSION_COOKIE_AGE
    expires = datetime.datetime.strftime(datetime.datetime.utcnow() + datetime.timedelta(seconds=settings.SESSION_COOKIE_AGE), "%a, %d-%b-%Y %H:%M:%S GMT")
    response.set_cookie('secure_plugin_client_session', request.session.session_key,
                                    max_age = max_age, expires = expires,
                                    domain = 'biogps.org',
                                    secure = False)#settings.SESSION_COOKIE_SECURE or None)
    return response

def is_dev_server(request):
    '''return True is server is running under django's dev server.'''
#    server_string = request.META.get('SERVER_SOFTWARE', '')
#    return server_string.startswith('WSGIServer')
    server_string = request.META.get('SERVER_SOFTWARE', '')
    return not server_string.startswith('Apache')


def mail_managers_in_html(subject, message, fail_silently=False):
    """Sends a message to the managers, as defined by the MANAGERS setting.
       passed message is a html document.
    """
    from django.core.mail import EmailMessage
    msg = EmailMessage(settings.EMAIL_SUBJECT_PREFIX + subject, message,
                       settings.SERVER_EMAIL, [a[1] for a in settings.MANAGERS])
    msg.content_subtype = "html"
    msg.send(fail_silently=fail_silently)


if settings.DEBUG:
    def get_test_client():
        '''A shortcut for returning a django test client.'''
        from django.test.client import Client
        return Client()

    def get_sql_queries():
        '''A shortcut for raw sql queries.'''
        from django.db import connection
        return connection.queries

