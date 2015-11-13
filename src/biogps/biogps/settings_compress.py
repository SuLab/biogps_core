#This file specify the css and js files will be compressed by "django-compress" app.
#Add "compress" into INSTALLED_APPS in "settings.py"
import os, os.path
from settings_base import ROOT_PATH

EXT_VERSION = '3.3.0'
JQUERY_VERSION = '1.4.2'

#####################################################################
# Custom file paths
EXTJS_PATH = 'js/ext/%s/' % EXT_VERSION

# Find the correct path to the compressor tools
if(os.name == 'mac' or os.name == 'posix'):
    if(os.path.exists('/Volumes')):
        # Mac OS X path
        TOOL_PATH = '/Volumes/BioGPS$/tools'
    else:
        # Linux path
        TOOL_PATH = '/opt/tools' if os.path.exists('/opt/tools') else '~/opt/tools'
elif(os.name == 'nt'):
    # Windows path
    TOOL_PATH = '\\\\projects\\BioGPS\\tools'


#####################################################################
# Compress Module Settings
#COMPRESS = True  #force to toggle compress on/off, default not DEBUG
COMPRESS_VERSION = True

PIPELINE_YUI_BINARY = "java -jar " + os.path.join(TOOL_PATH, "yuicompressor-2.4.6.jar")
PIPELINE_CLOSURE_BINARY = "java -jar " + os.path.join(TOOL_PATH, "closure/compiler.jar")

PIPELINE_JS_COMPRESSOR = 'pipeline.compressors.closure.ClosureCompressor'
PIPELINE_CSS_COMPRESSOR = 'pipeline.compressors.yuglify.YuglifyCompressor'

COMPRESS_CSS_FILTERS = ('compress.filters.yui.YUICompressorFilter',)
COMPRESS_JS_FILTERS = (
                       #'compress.filters.jsmin.JSMinFilter',
                       #'compress.filters.jspacker.JSPackerFilter',
                       'compress.filters.yui.YUICompressorFilter',
                       #'compress.filters.google_closure.GoogleClosureCompilerFilter',
                      )
#COMPRESS_CLOSURE_JS_ARGUMENTS = {'compilation_level': 'ADVANCED_OPTIMIZATIONS', }

# Defaults to 'lessc' available on PATH
LESS_BINARY = os.path.join(ROOT_PATH, 'build', 'less', 'bin', 'lessc')

#####################################################################
# Compress CSS & JS File Groupings

PIPELINE_CSS = {
    'mainApp': {
        'source_filenames': (
#                            EXTJS_PATH+"resources/css/ext-all.css",
                            "css/biogps.css",
                            "css/welcome.css",

                            "css/genelist.css",
                            "css/genereport.css",
                            "css/mystuff.css",
                            "css/tagbox.css",

                            "css/auth.css",
                            "css/openid.css",
                            "css/pluginlibrary.css",
                            "css/quickplugin.css",
                            "css/profile.css",
                            "css/friends.css",
                            ),
        'output_filename': 'css/min/biogps_mainApp.css'
    },

    # VERSION 2 LESS STYLING
    'common': {
        'source_filenames': [
            'css/dataset.css',
            'less/reset/html5boilerplate.css',
            'less/reset/yui-base.css',
            'less/base.less',
        ],
        'output_filename': 'dist/biogps.min.css'
    },
    # END VERSION 2

    'friends': {
        'source_filenames': (
                            "css/biogps.css",
                            "css/auth.css",
                            "css/profile.css",
                            "css/friends.css",
                            ),
        'output_filename': 'css/min/biogps_friends.css',
#        'extra_context': {},
    },

    # other CSS groups goes here
}

PIPELINE_JS = {
    'core': {
        'source_filenames': ('js/biogps/core/core_dispatch.js',),
        'output_filename': 'js/min/core.js'
    },

    'bootstrap': {
        'source_filenames': (
            'js2/bootstrap/modernizr.js',
            'js2/bootstrap/css_browser_selector.js',
            'js2/bootstrap/css_loading_start.js'
        ),
        'output_filename': 'dist/bootstrap.js'
    },

    'ext_mainApp': {
        'source_filenames': (
                            EXTJS_PATH+"adapter/ext/ext-base-debug.js",
                            EXTJS_PATH+"pkgs/ext-core-debug.js",

                            EXTJS_PATH+"pkgs/ext-foundation-debug.js",
                            EXTJS_PATH+"pkgs/cmp-foundation-debug.js",

                            EXTJS_PATH+"pkgs/ext-dd-debug.js",
                            EXTJS_PATH+"pkgs/data-foundation-debug.js",
                            EXTJS_PATH+"pkgs/data-json-debug.js",
                            EXTJS_PATH+"pkgs/data-xml-debug.js",
#                            EXTJS_PATH+"pkgs/data-grouping-debug.js",
#                            EXTJS_PATH+"pkgs/direct-debug.js",

                            EXTJS_PATH+"pkgs/resizable-debug.js",
                            EXTJS_PATH+"pkgs/window-debug.js",
                            EXTJS_PATH+"pkgs/state-debug.js",
                            EXTJS_PATH+"pkgs/data-list-views-debug.js",

                            EXTJS_PATH+"pkgs/pkg-tabs-debug.js",
                            EXTJS_PATH+"pkgs/pkg-buttons-debug.js",
                            EXTJS_PATH+"pkgs/pkg-toolbars-debug.js",
                            EXTJS_PATH+"pkgs/pkg-history-debug.js",
                            EXTJS_PATH+"pkgs/pkg-tips-debug.js",
                            EXTJS_PATH+"pkgs/pkg-tree-debug.js",
                            EXTJS_PATH+"pkgs/pkg-menu-debug.js",
                            EXTJS_PATH+"pkgs/pkg-forms-debug.js",
                            EXTJS_PATH+"pkgs/pkg-grid-foundation-debug.js",

                    ),
        'output_filename': 'js/min/ext_mainApp.js',
    },

    'mainApp': {
        'source_filenames': (
                            'js/ext/plugins/miframe-debug.js',
                            'js/biogps/mainApp/biogps_base.js',
                            'js/biogps/mainApp/infobar.js',
                            'js/biogps/mainApp/loginform.js',
                            'js/biogps/mainApp/biogpsplugin.js',
                            'js/biogps/mainApp/biogpslayout.js',
                            'js/biogps/mainApp/pluginpanel.js',
                            'js/biogps/mainApp/quickplugin.js',
                            'js/biogps/mainApp/mystuff.js',
                            'js/biogps/mainApp/searchpanel.js',
                            'js/biogps/mainApp/genelistpanel.js',
                            'js/biogps/mainApp/searchresultpanel.js',
                            'js/biogps/mainApp/genereportpanel.js',
                            'js/biogps/mainApp/biogps.js',
                            'js/biogps/mainApp/sorttable.js',
                            'js2/biogps/resources/json2.js',
                            'js2/biogps/resources/store.js'
                            ),
        'output_filename': 'js/min/biogps_mainApp.js'
    },

    'openid': {
        'source_filenames': ('js/biogps/openid/openid-jquery.js',),
        'output_filename': 'js/min/openid.js'
    },

    'bgprofile': {
        'source_filenames': (
                            'js/biogps/bgprofile/add_friend.js',
                            'js/biogps/bgprofile/edit_profile.js'
                            ),
        'output_filename': 'js/min/bgprofile.js'
    },

    'friends_invite': {
        'source_filenames': (
                            EXTJS_PATH+"adapter/ext/ext-base.js",
                            EXTJS_PATH+"pkgs/ext-core-debug.js",
                            EXTJS_PATH+"pkgs/ext-foundation-debug.js",
                            EXTJS_PATH+"pkgs/cmp-foundation-debug.js",
                            EXTJS_PATH+"pkgs/data-foundation-debug.js",
                            EXTJS_PATH+"pkgs/direct-debug.js",
                            EXTJS_PATH+"pkgs/pkg-buttons-debug.js",
                            EXTJS_PATH+"pkgs/pkg-toolbars-debug.js",
                            EXTJS_PATH+"pkgs/pkg-forms-debug.js",

                            "js/biogps/friends/friends.js",
                            ),
        'output_filename': 'js/min/friends_invite.js',
    },

    'jquery': {
        'source_filenames': (
                            'js/jquery/jquery-1.4.2.js',
                            'js/jquery/plugins/jquery.json-2.2.js',
                            'js/jquery/plugins/jquery.metadata.js',
                            'js/jquery/plugins/jquery.cycle.all.latest.js',
                            'js/jquery/plugins/template.js',
                            'js/jquery/plugins/jstorage.js',
                            ),
        'output_filename': 'js/min/jquery_custom.js'
    }
}


##Include Order of ext pkgs for customized build
##Do not delete
#                            EXTJS_PATH+"adapter/ext/ext-base.js",
#                            #EXTJS_PATH+"ext-all-debug.js",
#                            #EXTJS_PATH+"ext-core.js",
#
#                            EXTJS_PATH+"pkgs/ext-foundation-debug.js",
#                            EXTJS_PATH+"pkgs/cmp-foundation-debug.js",
#
#                            EXTJS_PATH+"pkgs/ext-dd-debug.js",
#                            EXTJS_PATH+"pkgs/data-foundation-debug.js",
#                            EXTJS_PATH+"pkgs/data-json-debug.js",
#                            EXTJS_PATH+"pkgs/data-xml-debug.js",
#                            EXTJS_PATH+"pkgs/data-grouping-debug.js",
#                            EXTJS_PATH+"pkgs/direct-debug.js",
#
#                            EXTJS_PATH+"pkgs/resizable-debug.js",
#                            EXTJS_PATH+"pkgs/window-debug.js",
#                            EXTJS_PATH+"pkgs/state-debug.js",
#                            EXTJS_PATH+"pkgs/data-list-views-debug.js",
#
#                            EXTJS_PATH+"pkgs/pkg-tabs-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-buttons-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-toolbars-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-history-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-tips-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-tree-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-charts-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-menu-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-forms-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-grid-foundation-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-grid-editor-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-grid-property-debug.js",
#                            EXTJS_PATH+"pkgs/pkg-grid-grouping-debug.js",
