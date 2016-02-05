from biogps.dataset.utils import DatasetQuery, sanitize
from biogps.rating.models import Rating
from biogps.search.navigations import BiogpsSearchNavigation, BiogpsNavigationDataset
from biogps.utils.http import JSONResponse, render_to_formatted_response
from biogps.utils.models import Species
from biogps.utils.restview import RestView
from biogps.utils import (const, log)

from django.http import HttpResponseNotFound
from django.shortcuts import render_to_response
from django.views.decorators.csrf import csrf_exempt
from django.http import Http404
from tagging.models import Tag
from time import time
import textwrap
import requests
from django.conf import settings


class DatasetLibraryView(RestView):
    '''This class defines views for REST URL:
         /dataset/
    '''
    def get(self, request):
        # Get the assorted dataset lists that will go in tabs.
        # get most popular
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/?order=pop')
        pop = res.json()['details']['results']
        list1 = []
        list1.append({
            'name': 'Most Popular',
            'more': '/dataset/all/?sort=popular',
            'items': pop
        })
        # get newest
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/?order=new')
        new = res.json()['details']['results']
        list1.append({
            'name': 'Newest Additions',
            'more': '/dataset/all/?sort=newest',
            'items': new
        })
        #if request.user.is_authenticated():
        #    mine = {
        #        'name': 'My Datasets',
        #        # 'more': '/dataset/mine/',
        #        'items': BiogpsDataset.objects.get_mine(request.user)
        #    }
        #    if len(mine['items']) > 0:
        #        list1.append(mine)

        # Get the assorted datasets lists that will go in large category boxes.
        # Check first row's category sizes, use largest to set box heights
        max_len = 0
        list2 = []
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/tag/cancer/')
        cat1 = res.json()['details']['results']
        cat1_len = 0
        for i in cat1:
            cat1_len += len(i['name'])
        max_len = cat1_len

        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/tag/arthritis/')
        cat2 = res.json()['details']['results']
        cat2_len = 0
        for i in cat2:
            cat2_len += len(i['name'])
        if cat2_len > max_len:
            max_len = cat2_len

        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/tag/obesity/')
        cat3 = res.json()['details']['results']
        cat3_len = 0
        for i in cat3:
            cat3_len += len(i['name'])
        if cat3_len > max_len:
            max_len = cat3_len
        # Adjust for display
        max_len *= 0.6

        list2.append({
            'name': 'Cancer',
            'more': '/dataset/tag/cancer/',
            'height': max_len,
            'items': cat1
        })

        list2.append({
            'name': 'Arthritis',
            'more': '/dataset/tag/arthritis/',
            'height': max_len,
            'items': cat2
        })

        list2.append({
            'name': 'Obesity',
            'more': '/dataset/tag/obesity/',
            'height': max_len,
            'items': cat3
        })

        list2.append({
            'name': 'Stem cell',
            'more': '/dataset/tag/stem-cell/',
            'items': requests.get(settings.DATASET_SERVICE_HOST + '/dataset/tag/stem cell/')
                      .json()['details']['results']
        })
        list2.append({
            'name': 'Immune System',
            'more': '/dataset/tag/immune-system/',
            'items': requests.get(settings.DATASET_SERVICE_HOST + '/dataset/tag/immune system/')
                      .json()['details']['results']
        })
        list2.append({
            'name': 'Nervous System',
            'more': '/dataset/tag/nervous-system/',
            'items': requests.get(settings.DATASET_SERVICE_HOST + '/dataset/tag/nervous system/')
                      .json()['details']['results']
        })

        # Set up the navigation controls, getting category facets from ES
        # res = es.query(None, only_in='dataset', start=0, size=1)
        # res = None
        # nav = BiogpsSearchNavigation(request, type='dataset', es_results=res)

        nav = BiogpsNavigationDataset('BioGPS Dataset Library')

        # Do the basic page setup and rendering
        prepare_breadcrumb(request)
        html_template = 'dataset/index.html'
        html_dictionary = {
            'list1': list1,
            'list2': list2,
            'species': Species,
            'all_tags': Tag.objects.all(),
            'navigation': nav,
        }
        return render_to_formatted_response(request,
                                            data=None,
                                            allowed_formats=['html'],
                                            html_template=html_template,
                                            html_dictionary=html_dictionary)


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
        from biogps.search.views import list as list_view
        kwargs.update(request.GET.items())
        kwargs.update({'in': 'dataset'})
        return list_view(request, *args, **kwargs)


class DatasetTagView(RestView):
    '''This class defines views for REST URL:
         /dataset/tag/(?sort=)
    '''
    def get(self, request):
        _sort = request.GET.get('sort', None)
        # tags start from 1 dataset
        args = {'count': 1, 'page_by': 9999}
        if _sort == 'popular':
            args['order'] = 'pop'
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/tag/', params=args)
        tags = res.json()['details']['results']
        # Set up the navigation controls
        # We use ES to give us the category facets
        # es = ESQuery(request.user)
        # res = es.query(None, only_in='dataset', start=0, size=1)
        # nav = BiogpsSearchNavigation(request, type='dataset', es_results=res)
        nav = BiogpsNavigationDataset('Dataset Tags')

        # Do the basic page setup and rendering
        prepare_breadcrumb(request)
        request.breadcrumbs('Tags', request.path_info)
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
    request.breadcrumbs('Dataset Library', '/dataset/')


class DatasetView(RestView):
    """This class defines views for REST URL:
       /dataset/<datasetID>/(?format=)

       Return all metadata for a dataset.
       ** Note: eventually change this to behave
       ** more like the PluginView.
    """
    def before(self, request, args, kwargs):
        ds_id = sanitize(kwargs.pop('datasetID'))
        ds = DatasetQuery.get_ds(ds_id)
        if ds:
            kwargs['dataset'] = ds
        else:
            raise Http404

    def get(self, request, dataset, slug=None):
        """Get a specific dataset page/object via GET
           format = html (default)    display dataset details page
                    json              return a dataset object in json format
                    xml               return a dataset object in xml format
        """
        if not dataset:
            raise Http404

        log.info('username=%s clientip=%s action=dataset_metadata id=%s',
            getattr(request.user, 'username', ''),
            request.META.get('REMOTE_ADDR', ''), dataset['id'])

        if 'format' in request.GET:
            sort_fac = request.GET.get('sortFactor', None)
            if sort_fac is not None:
                # Sort metadata by provided factor
                try:
                    dataset['factors'].sort(key=lambda x: x.values()[0][sort_fac])
                except KeyError:
                    pass

            return render_to_formatted_response(request,
                data=dataset, allowed_formats=['json', 'xml'])

        else:
            def wrap_str(_str, max_len):
                """ Textwrap _str to provided max length """
                len_str = len(_str)
                if len_str > max_len and len_str > 3:
                    _str = textwrap.wrap(_str, max_len - 3)[0] + '...'
                return _str

            # Standard HTML request
            nav = BiogpsSearchNavigation(request, params={'only_in': ['dataset']})
            prepare_breadcrumb(request)
            from django.template.defaultfilters import slugify
            abs_url = '/dataset/' + dataset['geo_gse_id'] + '/' + slugify(dataset['name'])
            request.breadcrumbs(wrap_str(dataset['name'], 140), abs_url)
            html_template = 'dataset/show.html'
            dataset['sample_geneid'] = const.sample_gene[dataset['species']]
            html_dictionary = {
                'current_obj': dataset,
                'obj_factors': dataset['factors'],
                'rating_scale': Rating.rating_scale,
                'rating_static': Rating.rating_static,
                'navigation': nav
            }
            return render_to_formatted_response(request,
                data=dataset, allowed_formats=['html', 'json', 'xml'],
                model_serializer='object_cvt', html_template=html_template,
                html_dictionary=html_dictionary)


class DatasetBotView(RestView):
    """This class defines views for REST URL:
        /dataset/bot/<geneID>/
    """
    def get(self, request, geneID):
        if not geneID:
            return HttpResponseNotFound('<b>No gene ID provided.</b>'
                                        '<br />Please provide a gene ID '
                                        'in the form of /dataset/bot/geneID')
        # Get reporters from mygene.info
        rep_li = DatasetQuery.get_mygene_reps(geneID)
        if not rep_li:
            return HttpResponseNotFound('<b>No reporters for gene ID {} found'
                '</b><br />Please confirm a valid '
                'gene ID has been provided'.format(geneID))
        else:
            # Get default datasets corresponding to the geneID
            ds = DatasetQuery.get_default_ds(geneID)
            ds_info = []
            if ds:
                ds_id = ds['dataset']
                rep_li = rep_li.strip(' ').split(',')
                ds_info = [{ds_id: {'name': ds['dataset'], 'reps': rep_li}}]

            return render_to_response('dataset/bot.html',
                {'gene_id': geneID, 'ds_info': ds_info})
