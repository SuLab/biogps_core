import datetime
from django.conf import settings
from django.template import Library
import __version__

register = Library()


@register.simple_tag
def jqueryjsfiles():
    MAIN_JAVASCRIPT_PROD = '''
    <script type="text/javascript" src="/assets/js/jquery/jquery-%(jqver)s.min.js"></script>
    '''

    MAIN_JAVASCRIPT_DEBUG = '''
    <script type="text/javascript" src="/assets/js/jquery/jquery-%(jqver)s.js"></script>
    '''

    if settings.DEBUG:
        main_javascript = MAIN_JAVASCRIPT_DEBUG % {'jqver': settings.JQUERY_VERSION}
    else:
        main_javascript = MAIN_JAVASCRIPT_PROD % {'jqver': settings.JQUERY_VERSION}

    return main_javascript


@register.simple_tag
def extcorejsfile():
    extcorejs = '''
    <script type="text/javascript" src="/assets/js/ext/%(extver)s/ext-core.js"></script>
    '''
    return extcorejs % {'extver': settings.EXT_VERSION}


@register.simple_tag
def extcssfiles():
    extcss = '''
    <link rel="stylesheet" type="text/css" href="/assets/js/ext/%(extver)s/resources/css/ext-all.css" />
    '''
    return extcss % {'extver': settings.EXT_VERSION}


@register.simple_tag
def biogps_ver():
    '''return a current biogps version number.
      e.g. ver 0.9.7.2964
    '''
    return 'ver ' + __version__.version


@register.simple_tag
def this_year():
    '''return the current year.
       used to alleviate the need to update the copyright notice every year.
    '''
    return datetime.date.today().year


@register.simple_tag
def rating_percentage(rating=5):
    return rating / 5.0 * 100


@register.simple_tag
def emailus(text="'+ out.join('') +'"):
    '''return a email link to biogps@googlegroups.com, which prevents email spoofing.
       if no text variable is supplied, it will output the email address.

       convert a normal string: ''.join([chr(ord(x)-8) for x in s])

       'help@biogps.org' = '`]dh8Zag_hk&gj_'
       'biogps@googlegroups.com'  ==> 'Zag_hk8_gg_d]_jgmhk&[ge'
    '''
    tpl = """<span id='emailuslink'></span>
<script>
var _addr = 'Zag_hk8_gg_d]_jgmhk&[ge';
var out = [];
for (var i=0;i<_addr.length;i++){
    out.push(String.fromCharCode(_addr.charCodeAt(i)+8));
}
var e = document.getElementById('emailuslink');
e.innerHTML = '<a href="mailto:' + out.join('') + '">' + '%s' + '</a>';
</script>"""
    return (tpl % text).replace('\n', '')


@register.simple_tag
def emailus2(text="'+ out.join('') +'"):
    '''return a email link to help@biogps.org, which prevents email spoofing.
       if no text variable is supplied, it will output the email address.

       convert a normal string: ''.join([chr(ord(x)-8) for x in s])

       'help@biogps.org' = '`]dh8Zag_hk&gj_'
       'biogps@googlegroups.com'  ==> 'Zag_hk8_gg_d]_jgmhk&[ge'
    '''
    tpl = """<span id='emailus2link'></span>
<script>
var _addr = '`]dh8Zag_hk&gj_';
var out = [];
for (var i=0;i<_addr.length;i++){
    out.push(String.fromCharCode(_addr.charCodeAt(i)+8));
}
var e = document.getElementById('emailus2link');
e.innerHTML = '<a href="mailto:' + out.join('') + '">' + '%s' + '</a>';
</script>"""
    return (tpl % text).replace('\n', '')


@register.simple_tag
def ga_header(usertype=None):
    '''usertype is a optional custom variable for something like
       Anonymous, BioGPS User, GNF User, Novartis User
       This makes use of Google Analytics Custom Variables
       http://code.google.com/apis/analytics/docs/tracking/gaTrackingCustomVariables.html
    '''
    trackercode = '''<script type="text/javascript">
        var _gaq = _gaq || [];
        _gaq.push(['_setAccount', 'UA-672247-4']);'''
    if usertype:
        trackercode += "_gaq.push(['_setCustomVar', 1, 'UserType', '%s', 2]);" % usertype
    trackercode += '''_gaq.push(['_trackPageview']);
        </script>'''
    return trackercode


@register.simple_tag
def ga():
    if settings.RELEASE_MODE == 'dev':
        trackercode = ''
    else:
        trackercode = '''<script type="text/javascript">
          (function() {
            var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
            ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(ga);
          })();
        </script>
        '''
    return trackercode


@register.simple_tag
def biogpstips():
    '''return a javascript array for tips.'''
    from biogps.www.models import BiogpsTip
    return '[' + ', '.join(['"' + tip.html.strip().replace('"', '\\"') + '"' for tip in BiogpsTip.objects.all().order_by('id')]) + ']'


@register.simple_tag
def extdirect_api():
    '''return a block of js code contains dynamic extdirect descriptor.'''
    from biogps.apps.extdirect.views import remote_provider
    js_code = '<script type="text/javascript">%s    </script>' % remote_provider.api2()
    return js_code
