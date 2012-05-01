'''
This file defines all views for URL pattern /plugin/*
'''
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils.encoding import smart_unicode
from django.contrib.sites.models import Site
from django.template.loader import render_to_string

from biogps.utils.restview import RestView
from biogps.utils.decorators import loginrequired
from biogps.utils.http import (JSONResponse, render_to_formatted_response,
                               json_error)
from biogps.utils.models import set_object_permission, Species

from tagging.models import Tag
from biogps.apps.rating.models import Rating
from biogps.apps.search.navigations import BiogpsSearchNavigation
from biogps.apps.search.es_lib import ESQuery
from models import BiogpsPlugin
from forms import BiogpsPluginForm

import logging
log = logging.getLogger('biogps')


class PluginLibraryView(RestView):
    '''This class defines views for REST URL:
         /plugin/
    '''
    def get(self, request):
        # Get the assorted plugin lists that will go in tabs.
        _dbobjects = BiogpsPlugin.objects.get_available(request.user)
        max_in_list = 15

        list1 = []
        list1.append({
            'name': 'Most Popular',
            'more': '/plugin/all/?sort=popular',
            'items': _dbobjects.filter(popularity__score__isnull=False).order_by('-popularity__score')[:max_in_list]
        })
        list1.append({
            'name': 'Newest Additions',
            'more': '/plugin/all/?sort=newest',
            'items': _dbobjects.order_by('-created')[:max_in_list]
        })
        if request.user.is_authenticated():
            mine = {
                'name': 'My Plugins',
                # 'more': '/plugin/mine/',
                'items': BiogpsPlugin.objects.get_mine(request.user)
            }
            if len(mine['items']) > 0:
                list1.append(mine)

        # Get the assorted plugins lists that will go in large category boxes.
        list2 = []
        list2.append({
            'name': 'Expression data',
            'more': '/plugin/tag/expression/',
            'items': _dbobjects.filter(id__in=[26, 430, 440, 58, 9, 469, 38, 200]).order_by('title')
        })
        list2.append({
            'name': 'Protein resources',
            'more': '/plugin/tag/protein/',
            'items': _dbobjects.filter(id__in=[29, 431, 37, 65, 22, 428, 25, 179, 39]).order_by('title')
        })
        list2.append({
            'name': 'Genetics resources',
            'more': '/plugin/tag/genetics/',
            'items': _dbobjects.filter(id__in=[221, 320, 80, 35, 120, 495, 31, 462, 125, 241, 424]).order_by('title')
        })
        list2.append({
            'name': 'Gene portals and MODs',
            'more': '/plugin/tag/portal/',
            'items': _dbobjects.filter(id__in=[27, 69, 10, 30, 47, 32, 135]).order_by('title')
        })
        list2.append({
            'name': 'Pathway databases',
            'more': '/plugin/tag/pathway/',
            'items': _dbobjects.filter(id__in=[565, 15, 66, 500, 159, 259, 319]).order_by('title')
        })
        list2.append({
            'name': 'Literature',
            'more': '/plugin/tag/literature/',
            'items': _dbobjects.filter(id__in=[68, 49, 470, 322, 339, 48]).order_by('title')
        })
        # Sort the list by the number of plugins, which makes the final
        # rendering look nice at all resolutions.
        list2.sort( key=lambda x:( len(x['items']), x['name'] ) )

        # Set up the navigation controls
        # We use ES to give us the category facets
        es = ESQuery(request.user)
        res = es.query(None, only_in='plugin', start=0, size=1)
        nav = BiogpsSearchNavigation(request, type='plugin', es_results=res)

        # Do the basic page setup and rendering
        prepare_breadcrumb(request)
        html_template = 'plugin/index.html'
        html_dictionary = {
            'list1': list1,
            'list2': list2,
            'species': Species,
            'all_tags': Tag.objects.all(),
            'navigation': nav
        }
        return render_to_formatted_response(request,
                                            data=None,
                                            allowed_formats=['html'],
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)

    @loginrequired
    def post(self, request, sendemail=True):
        '''
        If sendemail is True, an notification email will be sent out for every new plugin added.
        '''
        rolepermission = request.POST.get('rolepermission', None)
        userpermission = request.POST.get('userpermission', None)
        tags = request.POST.get('tags', None)
        data = {'success': False}

        f = BiogpsPluginForm(request.POST)
        if f.is_valid():
            #flag to allow save duplicated (same url, type, options) plugin
            allowdup = (request.POST.get('allowdup', None) == '1')
            if not allowdup:
                all_plugins = BiogpsPlugin.objects.get_available(request.user)
                dup_plugins = all_plugins.filter(url=f.cleaned_data['url'])

                if dup_plugins.count() > 0:
                    data = {'success': False,
                            'dup_plugins': [dict(id=p.id, text=unicode(p), url=p.get_absolute_url()) for p in dup_plugins],
                            'error': 'Duplicated plugin exists!'}
                    return JSONResponse(data, status=400)

            # proceed with saving the plugin
            plugin = f.save(commit=False)
            plugin.type = 'iframe'
            plugin.ownerprofile = request.user.get_profile()
            plugin.save()

            if rolepermission or userpermission:
                set_object_permission(plugin, rolepermission, userpermission, sep=',')

            if tags is not None:
                plugin.tags = smart_unicode(tags)

            plugin.save()   # Save again to trigger ES index update
            data['success'] = True
            data['id'] = plugin.id

            #logging plugin add
            log.info('username=%s clientip=%s action=plugin_add id=%s',
                        getattr(request.user, 'username', ''),
                        request.META.get('REMOTE_ADDR', ''),
                        plugin.id)

            if not settings.DEBUG and sendemail:
                #send email notification
                from biogps.utils.helper import mail_managers_in_html
                current_site = Site.objects.get_current()
                subject = 'New Plugin "%s" by %s' % (plugin.title, plugin.author)
                message = render_to_string('plugin/newplugin_notification.html', {'p': plugin, 'site': current_site})
                mail_managers_in_html(subject, message, fail_silently=True)
        else:
            data['success'] = False
            data['errors'] = f.errors

        return JSONResponse(data, status=200 if data['success'] else 400)


class PluginListView(RestView):
    '''This class defines views for REST URL:
         /plugin/all/
         /plugin/mine/
         /plugin/popular/
         /plugin/tag/expression/
         /plugin/species/human/
         /plugin/species/human/tag/expression/
    '''
    def get(self, request, *args, **kwargs):
        prepare_breadcrumb(request)
        from biogps.apps.search.views import list as list_view
        kwargs.update(request.GET.items())
        kwargs.update( {'in':'plugin'} )
        return list_view(request, *args, **kwargs)


class PluginView(RestView):
    '''This class defines views for REST URL:
         /plugin/<plugin_id>/
    '''
    def before(self, request, args, kwargs):
        if request.method == 'GET':
            available_plugins = BiogpsPlugin.objects.get_available(request.user)
        else:
            available_plugins = BiogpsPlugin.objects.get_mine(request.user)
        kwargs['plugin'] = get_object_or_404(available_plugins,
                                             id=kwargs.pop('plugin_id'))


    def get(self, request, plugin, slug=None):
        '''Get a specific plugin page/object via GET
           format = html (default)    display plugin details page
                    json              return a plugin object in json format
                    xml               return a plugin object in xml format
        '''
        if request.user.is_authenticated():
            plugin.prep_user_data(request.user)

        nav = BiogpsSearchNavigation(request, params={'only_in':['plugin']})
        prepare_breadcrumb(request)
        request.breadcrumbs( plugin.title, plugin.get_absolute_url )
        html_template = 'plugin/show.html'
        html_dictionary = {
            'current_obj': plugin,
            'rating_scale': Rating.rating_scale,
            'rating_static': Rating.rating_static,
            'canonical': plugin.get_absolute_url(),
            'navigation': nav
        }
        return render_to_formatted_response(request,
                                            data=plugin,
                                            allowed_formats=['html', 'json', 'xml'],
                                            model_serializer='object_cvt',
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)

    @loginrequired
    def put(self, request, plugin, slug=None):
        '''
        Modify a plugin via PUT.
        '''
        rolepermission = request.PUT.get('rolepermission', None)
        userpermission = request.PUT.get('userpermission', None)
        tags = request.PUT.get('tags', None)
        data = {'success': False}

        f = BiogpsPluginForm(request.PUT, instance=plugin)
        if f.is_valid():
            if rolepermission or userpermission:
                set_object_permission(plugin, rolepermission, userpermission, sep=',')

            if tags is not None:
                plugin.tags = smart_unicode(tags)

            f.save()
            data['success'] = True
        else:
            data['success'] = False
            data['errors'] = f.errors

        return JSONResponse(data, status=200 if data['success'] else 400)

    @loginrequired
    def delete(self, request, plugin, slug=None):
        plugin.delete()
        del plugin.permission

        #logging plugin delete
        log.info('username=%s clientip=%s action=plugin_delete id=%s',
                    getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    plugin.id)

        data = {'success': True}

        return JSONResponse(data)


class PluginEditView(RestView):
    '''This class defines views for REST URL:
         /plugin/<plugin_id>/edit/
    '''
    def before(self, request, args, kwargs):
        available_plugins = BiogpsPlugin.objects.get_mine(request.user)
        kwargs['plugin'] = get_object_or_404(available_plugins,
                                             id=kwargs.pop('plugin_id'))

    @loginrequired
    def get(self, request, plugin):
        '''Get an editing form for a specific plugin object via GET
           format = html (default)    display plugin edit page
        '''
        form = BiogpsPluginForm(instance=plugin)

        nav = BiogpsSearchNavigation(request, params={'only_in':['plugin']})
        prepare_breadcrumb(request)
        request.breadcrumbs( plugin.title, plugin.get_absolute_url )
        request.breadcrumbs( 'Edit', request.path_info )
        html_template = 'plugin/edit.html'
        html_dictionary = {
            'plugin': plugin,
            'form': form,
            'species': Species,
            'all_tags': Tag.objects.all(),
            'navigation': nav
        }
        return render_to_formatted_response(request,
                                            data=plugin,
                                            allowed_formats=['html'],
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)


class PluginNewView(RestView):
    '''This class defines views for REST URL:
         /plugin/new/
    '''
    @loginrequired
    def get(self, request):
        '''Get an creation form for a new plugin object via GET
           format = html (default)    display plugin creation page
        '''
        form = BiogpsPluginForm()
        nav = BiogpsSearchNavigation(request, params={'only_in':['plugin']})
        prepare_breadcrumb(request)
        request.breadcrumbs( 'New Plugin', request.path_info )
        html_template = 'plugin/new.html'
        html_dictionary = {
            'form': form,
            'species': Species,
            'all_tags': Tag.objects.all(),
            'navigation': nav
        }
        return render_to_formatted_response(request,
                                            data=None,
                                            allowed_formats=['html'],
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)



class PluginTagView(RestView):
    '''This class defines views for REST URL:
         /plugin/tag/
    '''
    def get(self, request):
        _dbobjects = BiogpsPlugin.objects.get_available(request.user)
        tags = Tag.objects.usage_for_queryset(_dbobjects, counts=True, min_count=2)

        # Set up the navigation controls
        # We use ES to give us the category facets
        es = ESQuery(request.user)
        res = es.query(None, only_in='plugin', start=0, size=1)
        nav = BiogpsSearchNavigation(request, type='plugin', es_results=res)

        # Do the basic page setup and rendering
        prepare_breadcrumb(request)
        request.breadcrumbs( 'Tags', request.path_info )
        html_template = 'plugin/tags.html'
        html_dictionary = {
            'all_tags': tags,
            'navigation': nav
        }
        return render_to_formatted_response(request,
                                            data=None,
                                            allowed_formats=['html'],
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)


def prepare_breadcrumb(request):
    '''This function sets up the initial breadcrumb trail for all pages
       in the plugin library.
    '''
    #request.breadcrumbs( 'Library', '/library/' )
    #request.breadcrumbs( 'Plugins', '/plugin/' )
    request.breadcrumbs( 'Plugin Library', '/plugin/' )


def test_plugin_url(request):
    '''This view is used to test a url template with a given gene.
       http://biogps-dev.gnf.org/plugin/test?url=http://www.google.com/search?q={{Symbol}}&geneid=1017
       http://biogps-dev.gnf.org/plugin/test?url=http://www.google.com/search?q={{MGI}}&species=mouse&geneid=1017

       if species is not provided, all available species are assumed.
    '''
    from biogps.apps.boc import boc_svc as svc
    from biogps.apps.plugin.plugin import PluginUrlRenderError
    from biogps.utils.helper import is_valid_geneid

    geneid = request.GET.get('geneid', '').strip()
    url = request.GET.get('url', '').strip()
    species = [s.strip() for s in request.GET.get('species', '').split(',')]
    species = None if species == [''] else species
    if not geneid or not url:
        return json_error('Missing required parameter.', status=400)
    if not is_valid_geneid(geneid):
        return json_error('Invalid input parameters!', status=400)
    plugin = BiogpsPlugin(url=url, species=species)
    ds = svc.DataService()
    g = ds.getgene2(geneid)

    if not g or len(g['SpeciesList']) == 0:
        return json_error('Unknown gene id.', status=400)

    try:
        url = plugin.geturl(g)
    except PluginUrlRenderError, err:
        return json_error(err.args[0], status=400)

    data = {'success': True,
            'geneid': geneid,
            'url': url}
    return JSONResponse(data)

