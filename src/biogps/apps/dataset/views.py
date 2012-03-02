'''
This file defines all views for URL pattern /dataset/*
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
from models import BiogpsDataset
#from forms import BiogpsDatasetForm

import logging
log = logging.getLogger('biogps')


class DatasetLibraryView(RestView):
    '''This class defines views for REST URL:
         /dataset/
    '''
    def get(self, request):
        # Get the assorted dataset lists that will go in tabs.
        _dbobjects = BiogpsDataset.objects.get_available(request.user)
        max_in_list = 15

        list1 = []
        list1.append({
            'name': 'Most Popular',
            'more': '/dataset/all/?sort=popular',
            #'items': _dbobjects.filter(popularity__score__isnull=False).order_by('-popularity__score')[:max_in_list]
        })
        list1.append({
            'name': 'Newest Additions',
            # 'more': '/dataset/all/?sort=newest',
            'items': _dbobjects.order_by('-created')[:max_in_list]
        })
        if request.user.is_authenticated():
            mine = {
                'name': 'My Datasets',
                # 'more': '/dataset/mine/',
                'items': BiogpsDataset.objects.get_mine(request.user)
            }
            if len(mine['items']) > 0:
                list1.append(mine)

        # Get the assorted datasets lists that will go in large category boxes.
        list2 = []
        list2.append({
            'name': 'Expression data',
            'more': '/dataset/tag/expression/',
            'items': _dbobjects.filter(id__in=[26, 430, 440, 58, 9, 469, 38, 200]).order_by('name')
        })
        list2.append({
            'name': 'Protein resources',
            'more': '/dataset/tag/protein/',
            'items': _dbobjects.filter(id__in=[29, 431, 37, 65, 22, 428, 25, 179, 39]).order_by('name')
        })
        list2.append({
            'name': 'Genetics resources',
            'more': '/dataset/tag/genetics/',
            'items': _dbobjects.filter(id__in=[221, 320, 80, 35, 120, 495, 31, 462, 125, 241, 424]).order_by('name')
        })
        list2.append({
            'name': 'Gene portals and MODs',
            'more': '/dataset/tag/portal/',
            'items': _dbobjects.filter(id__in=[27, 69, 10, 30, 47, 32, 135]).order_by('name')
        })
        list2.append({
            'name': 'Pathway databases',
            'more': '/dataset/tag/pathway/',
            'items': _dbobjects.filter(id__in=[565, 15, 66, 500, 159, 259, 319]).order_by('name')
        })
        list2.append({
            'name': 'Literature',
            'more': '/dataset/tag/literature/',
            'items': _dbobjects.filter(id__in=[68, 49, 470, 322, 339, 48]).order_by('name')
        })
        # Sort the list by the number of datasets, which makes the final
        # rendering look nice at all resolutions.
        list2.sort( key=lambda x:( len(x['items']), x['name'] ) )

        # Set up the navigation controls
        # We use ES to give us the category facets
        es = ESQuery(request.user)
        res = es.query(None, only_in='dataset', start=0, size=1)
        nav = BiogpsSearchNavigation(request, type='dataset', es_results=res)

        # Do the basic page setup and rendering
        prepare_breadcrumb(request)
        html_template = 'dataset/index.html'
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
        If sendemail is True, an notification email will be sent out for every new dataset added.
        '''
        rolepermission = request.POST.get('rolepermission', None)
        userpermission = request.POST.get('userpermission', None)
        tags = request.POST.get('tags', None)
        data = {'success': False}

        f = BiogpsDatasetForm(request.POST)
        if f.is_valid():
            dataset = f.save(commit=False)
            dataset.type = 'iframe'
            dataset.ownerprofile = request.user.get_profile()
            dataset.save()

            if rolepermission or userpermission:
                set_object_permission(dataset, rolepermission, userpermission, sep=',')

            if tags is not None:
                dataset.tags = smart_unicode(tags)

            dataset.save()   # Save again to trigger ES index update
            data['success'] = True
            data['id'] = dataset.id
        else:
            data['success'] = False
            data['errors'] = f.errors

        #flag to allow save duplicated (same url, type, options) dataset
        allowdup = (request.POST.get('allowdup', None) == '1')
        allowdup = True # Temporarily disabling this feature.

        if not allowdup:
            all_datasets = BiogpsDataset.objects.get_available(request.user)
            dup_datasets = all_datasets.filter(url=f.cleaned_data['url'])

            if dup_datasets.count() > 0:
                data = {'success': False,
                        'dup_datasets': [dict(id=p.id, text=unicode(p)) for p in dup_datasets],
                        'error': 'Duplicated dataset exists!'}
                return JSONResponse(data, status=400)


        #logging dataset add
        log.info('username=%s clientip=%s action=dataset_add id=%s',
                    getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    dataset.id)

        if not settings.DEBUG and sendemail:
            #send email notification
            from biogps.utils.helper import mail_managers_in_html
            current_site = Site.objects.get_current()
            subject = 'New Dataset "%s" by %s' % (dataset.name, dataset.author)
            message = render_to_string('dataset/newdataset_notification.html', {'p': dataset, 'site': current_site})
            mail_managers_in_html(subject, message, fail_silently=True)

        return JSONResponse(data, status=200 if data['success'] else 400)


class DatasetListView(RestView):
    '''This class defines views for REST URL:
         /dataset/all/
         /dataset/mine/
         /dataset/popular/
         /dataset/tag/expression/
         /dataset/species/human/
         /dataset/species/human/tag/expression/
    '''
    def get(self, request, *args, **kwargs):
        prepare_breadcrumb(request)
        from biogps.apps.search.views import list as list_view
        kwargs.update( {'in':'dataset'} )
        return list_view(request, *args, **kwargs)


class DatasetView(RestView):
    '''This class defines views for REST URL:
         /dataset/<dataset_id>/
    '''
    def before(self, request, args, kwargs):
        if request.method == 'GET':
            available_datasets = BiogpsDataset.objects.get_available(request.user)
        else:
            available_datasets = BiogpsDataset.objects.get_mine(request.user)
        kwargs['dataset'] = get_object_or_404(available_datasets,
                                             id=kwargs.pop('dataset_id'))

    def get(self, request, dataset, slug=None):
        '''Get a specific dataset page/object via GET
           format = html (default)    display dataset details page
                    json              return a dataset object in json format
                    xml               return a dataset object in xml format
        '''
        if request.user.is_authenticated():
            dataset.prep_user_data(request.user)

        nav = BiogpsSearchNavigation(request, params={'only_in':['dataset']})
        prepare_breadcrumb(request)
        request.breadcrumbs( dataset.name[:50] + '...'  if len(dataset.name)
                            > 53 else dataset.name, dataset.get_absolute_url )
        html_template = 'dataset/show.html'
        html_dictionary = {
            'current_obj': dataset,
            'rating_scale': Rating.rating_scale,
            'rating_static': Rating.rating_static,
            'canonical': dataset.get_absolute_url(),
            'navigation': nav
        }
        return render_to_formatted_response(request,
                                            data=dataset,
                                            allowed_formats=['html', 'json', 'xml'],
                                            model_serializer='object_cvt',
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)

    @loginrequired
    def put(self, request, dataset, slug=None):
        '''
        Modify a dataset via PUT.
        '''
        rolepermission = request.PUT.get('rolepermission', None)
        userpermission = request.PUT.get('userpermission', None)
        tags = request.PUT.get('tags', None)
        data = {'success': False}

        f = BiogpsDatasetForm(request.PUT, instance=dataset)
        if f.is_valid():
            if rolepermission or userpermission:
                set_object_permission(dataset, rolepermission, userpermission, sep=',')

            if tags is not None:
                dataset.tags = smart_unicode(tags)

            f.save()
            data['success'] = True
        else:
            data['success'] = False
            data['errors'] = f.errors

        return JSONResponse(data, status=200 if data['success'] else 400)

    @loginrequired
    def delete(self, request, dataset, slug=None):
        dataset.delete()
        del dataset.permission

        #logging dataset delete
        log.info('username=%s clientip=%s action=dataset_delete id=%s',
                    getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    dataset.id)

        data = {'success': True}

        return JSONResponse(data)


class DatasetEditView(RestView):
    '''This class defines views for REST URL:
         /dataset/<dataset_id>/edit/
    '''
    def before(self, request, args, kwargs):
        available_datasets = BiogpsDataset.objects.get_mine(request.user)
        kwargs['dataset'] = get_object_or_404(available_datasets,
                                             id=kwargs.pop('dataset_id'))

    @loginrequired
    def get(self, request, dataset):
        '''Get an editing form for a specific dataset object via GET
           format = html (default)    display dataset edit page
        '''
        form = BiogpsDatasetForm(instance=dataset)

        nav = BiogpsSearchNavigation(request, params={'only_in':['dataset']})
        prepare_breadcrumb(request)
        request.breadcrumbs( dataset.name[:50] + '...' if len(dataset.name)
                           > 53 else dataset.name, dataset.get_absolute_url )
        request.breadcrumbs( 'Edit', request.path_info )
        html_template = 'dataset/edit.html'
        html_dictionary = {
            'dataset': dataset,
            'form': form,
            'species': Species,
            'all_tags': Tag.objects.all(),
            'navigation': nav
        }
        return render_to_formatted_response(request,
                                            data=dataset,
                                            allowed_formats=['html'],
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)


class DatasetNewView(RestView):
    '''This class defines views for REST URL:
         /dataset/new/
    '''
    @loginrequired
    def get(self, request):
        '''Get an creation form for a new dataset object via GET
           format = html (default)    display dataset creation page
        '''
        form = BiogpsDatasetForm()
        nav = BiogpsSearchNavigation(request, params={'only_in':['dataset']})
        prepare_breadcrumb(request)
        request.breadcrumbs( 'New Dataset', request.path_info )
        html_template = 'dataset/new.html'
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



class DatasetTagView(RestView):
    '''This class defines views for REST URL:
         /dataset/tag/
    '''
    def get(self, request):
        _dbobjects = BiogpsDataset.objects.get_available(request.user)
        tags = Tag.objects.usage_for_queryset(_dbobjects, counts=True, min_count=2)

        # Set up the navigation controls
        # We use ES to give us the category facets
        es = ESQuery(request.user)
        res = es.query(None, only_in='dataset', start=0, size=1)
        nav = BiogpsSearchNavigation(request, type='dataset', es_results=res)

        # Do the basic page setup and rendering
        prepare_breadcrumb(request)
        request.breadcrumbs( 'Tags', request.path_info )
        html_template = 'dataset/tags.html'
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
       in the dataset library.
    '''
    request.breadcrumbs( 'Library', '/library/' )
    request.breadcrumbs( 'Datasets', '/dataset/' )


def test_dataset_url(request):
    '''This view is used to test a url template with a given gene.
       http://biogps-dev.gnf.org/dataset/test?url=http://www.google.com/search?q={{Symbol}}&geneid=1017
       http://biogps-dev.gnf.org/dataset/test?url=http://www.google.com/search?q={{MGI}}&species=mouse&geneid=1017

       if species is not provided, all available species are assumed.
    '''
    from biogps.apps.boc import boc_svc as svc
    from biogps.apps.dataset.dataset import DatasetUrlRenderError
    from biogps.utils.helper import is_valid_geneid

    geneid = request.GET.get('geneid', '').strip()
    url = request.GET.get('url', '').strip()
    species = [s.strip() for s in request.GET.get('species', '').split(',')]
    species = None if species == [''] else species
    if not geneid or not url:
        return json_error('Missing required parameter.', status=400)
    if not is_valid_geneid(geneid):
        return json_error('Invalid input parameters!', status=400)
    dataset = BiogpsDataset(url=url, species=species)
    ds = svc.DataService()
    g = ds.getgene2(geneid)

    if not g or len(g['SpeciesList']) == 0:
        return json_error('Unknown gene id.', status=400)

    try:
        url = dataset.geturl(g)
    except DatasetUrlRenderError, err:
        return json_error(err.args[0], status=400)

    data = {'success': True,
            'geneid': geneid,
            'url': url}
    return JSONResponse(data)

