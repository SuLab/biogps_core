from biogps.apps.dataset.models import BiogpsDataset, BiogpsDatasetData
from biogps.apps.dataset.utils import DatasetQuery, sanitize
from biogps.apps.rating.models import Rating
from biogps.apps.search.es_lib import ESQuery
from biogps.apps.search.navigations import BiogpsSearchNavigation, BiogpsNavigationDataset
from biogps.apps.stat.models import BiogpsStat
from biogps.utils.http import JSONResponse, render_to_formatted_response
from biogps.utils.models import Species
from biogps.utils.restview import RestView
from biogps.utils import (const, log)
from django.http import (
    HttpResponse,
    HttpResponseForbidden,
    HttpResponseNotFound
    )
from django.shortcuts import get_object_or_404, render_to_response
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

    #@loginrequired
    #def post(self, request, sendemail=True):
    #    '''
    #    If sendemail is True, an notification email will be sent out for every new dataset added.
    #    '''
    #    rolepermission = request.POST.get('rolepermission', None)
    #    userpermission = request.POST.get('userpermission', None)
    #    tags = request.POST.get('tags', None)
    #    data = {'success': False}

    #    f = BiogpsDatasetForm(request.POST)
    #    if f.is_valid():
    #        #flag to allow save duplicated (same url, type, options) dataset
    #        allowdup = (request.POST.get('allowdup', None) == '1')
    #        if not allowdup:
    #            all_datasets = BiogpsDataset.objects.get_available(request.user)
    #            dup_datasets = all_datasets.filter(url=f.cleaned_data['url'])

    #            if dup_datasets.count() > 0:
    #                data = {'success': False,
    #                        'dup_datasets': [dict(id=d.id, text=unicode(d), url=d.get_absolute_url()) for d in dup_datasets],
    #                        'error': 'Duplicated dataset exists!'}
    #                return JSONResponse(data, status=400)

    #        # proceed with saving the dataset
    #        dataset = f.save(commit=False)
    #        dataset.type = 'iframe'
    #        dataset.ownerprofile = request.user.get_profile()
    #        dataset.save()

    #        if rolepermission or userpermission:
    #            set_object_permission(dataset, rolepermission, userpermission, sep=',')

    #        if tags is not None:
    #            dataset.tags = smart_unicode(tags)

    #        dataset.save()   # Save again to trigger ES index update
    #        data['success'] = True
    #        data['id'] = dataset.id

    #        #logging dataset add
    #        log.info('username=%s clientip=%s action=dataset_add id=%s',
    #                    getattr(request.user, 'username', ''),
    #                    request.META.get('REMOTE_ADDR', ''),
    #                    dataset.id)

    #        if not settings.DEBUG and sendemail:
    #            #send email notification
    #            from biogps.utils.helper import mail_managers_in_html
    #            current_site = Site.objects.get_current()
    #            subject = 'New dataset "%s" by %s' % (dataset.name, dataset.owner.username)
    #            message = render_to_string('dataset/newdataset_notification.html', {'d': dataset, 'site': current_site})
    #            mail_managers_in_html(subject, message, fail_silently=True)
    #    else:
    #        data['success'] = False
    #        data['errors'] = f.errors

    #    return JSONResponse(data, status=200 if data['success'] else 400)


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
        kwargs.update(request.GET.items())
        kwargs.update({'in': 'dataset'})
        return list_view(request, *args, **kwargs)


class DatasetNewView(RestView):
    '''This class defines views for REST URL:
         /dataset/new/
    '''
    #@loginrequired
    def get(self, request):
        return HttpResponseNotFound()
    #    '''Get a creation form for a new dataset object via GET
    #       format = html (default)    display dataset creation page
    #    '''
    #    form = BiogpsPluginForm()
    #    nav = BiogpsSearchNavigation(request, params={'only_in': ['dataset']})
    #    prepare_breadcrumb(request)
    #    request.breadcrumbs('New Dataset', request.path_info)
    #    html_template = 'dataset/new.html'
    #    html_dictionary = {
    #        'form': form,
    #        'species': Species,
    #        'all_tags': Tag.objects.all(),
    #        'navigation': nav
    #    }
    #    return render_to_formatted_response(request,
    #                                        data=None,
    #                                        allowed_formats=['html'],
    #                                        html_template=html_template,
    #                                        html_dictionary=html_dictionary)


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
        res = requests.get(settings.DATASET_SERVICE_HOST + '/dataset/'+ds_id+'/4-biogps/')
        if res.json()['code'] != 0:
            raise Http404

        ds = res.json()['details']
        owner_map = {
            'Andrew Su': '/profile/3/asu',
            'Tom Freeman': '/profile/309/tfreeman',
            'ArrayExpress Uploader': '/profile/8773/arrayexpressuploader'
        }
        try:
            ds['owner_profile'] = owner_map[ds['owner']]
        except Exception,e:
            ds['owner_profile'] = None
        kwargs['dataset'] = ds

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


@csrf_exempt
class DatasetSearchView(RestView):
    """This class defines views for REST URL:
        /dataset/search/

       Given a list of reporters, return the datasets
       that contain them.

       Given a gene ID, return the relevant datasets,
       dataset names, and reporters.

       Given a query term, return the relevant datasets.
    """
    def get(self, request):
        dbug = False
        json_response = None
        page = request.GET.get('page', 1)
        q_term = None
        rep_li = None

        if request.GET.get('debug'):
            dbug = True
            search_start = time()
        if request.GET.get('gene'):
            # Gene ID search
            gene_id = request.GET['gene']

            # Get reporters from mygene.info
            rep_li = DatasetQuery.get_mygene_reps(gene_id)
        elif request.GET.get('reporters'):
            rep_li = request.GET['reporters']
            if rep_li is not None:
                # Get datasets corresponding to reporters
                if request.GET.get('q'):
                    # Query term search
                    q_term = request.GET['q']
                if request.GET.get('defaultDS'):
                    # Get default datasets
                    json_response = DatasetQuery.get_default_ds(rep_li, q_term)
                else:
                    # Get all datasets
                    json_response = DatasetQuery.get_ds_page(rep_li,
                        page, q_term)

        if dbug:
            search_end = time()
            json_response += ('DEBUG:', 'Search {}'
            ' secs'.format(round(search_end - search_start, 3)))
        jsonp = request.GET.get('callback', None)
        return JSONResponse(json_response, jsonp=jsonp)


@csrf_exempt
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
            # Get default datasets corresponding to reporters
            ds_li = DatasetQuery.get_default_ds(rep_li)

            # Determine reporters in each dataset
            ds_info = list()  # [{'1': {'name':'U133A', 'reps':['1007_s_at']}}]
            rep_li = rep_li.strip(' ').split(',')
            for i in ds_li:
                ds_id = i['id']
                ds_reps = BiogpsDatasetData.objects.filter(dataset=ds_id,
                    reporter__in=rep_li).values_list('reporter', flat=True)

                # Combine dataset names and reporters based on ID
                _ds_dict = {ds_id: {'name': i['name'], 'reps': ds_reps}}
                ds_info.append(_ds_dict)

            return render_to_response('dataset/bot.html',
                {'gene_id': geneID, 'ds_info': ds_info})


@csrf_exempt
class DatasetValuesView(RestView):
    """This class defines views for REST URL:
        /dataset/<datasetID>/values/?reporters=...(&gene=)(&format=)
    """
    def get(self, request, datasetID):
        try:
            get_reporters = [i for i in request.GET['reporters'].split(',')]
        except KeyError:
            return HttpResponseNotFound('<b>No reporters provided.</b>'
                                        '<br />Please provide reporters '
                                        'in the form of ?reporters=rep1,rep2')
        datasetID = sanitize(datasetID)
        alt_formats = ['csv']
        gene_id = request.GET.get('gene', None)
        _format = request.GET.get('format', None)
        try:
            _format = _format.lower()
            if _format not in alt_formats:
                _format = None
        except AttributeError:
            # None type
            pass
        _data = DatasetQuery.get_ds_data(datasetID, get_reporters, gene_id,
            _format)
        if _data and _format is not None:
            # Already formatted, simply return data
            return _data
        else:
            return render_to_formatted_response(request, data=_data,
                allowed_formats=['json', 'xml'])


@csrf_exempt
class DatasetStaticChartView(RestView):
    """This class defines views for REST URL:
        /dataset/<datasetID>/chart/<reporterID>/

       Given a dataset ID and reporter,
       return the static chart image.
    """
    def get(self, request, datasetID, reporterID):
        datasetID = sanitize(datasetID)
        sort_fac = request.GET.get('sortFactor', None)
        chart_img = DatasetQuery.get_ds_chart(datasetID, reporterID, sort_fac)
        if chart_img is None:
            return HttpResponseNotFound("No data found for dataset ID #{}"
                " and reporter '{}'.".format(datasetID, reporterID))
        try:
            return HttpResponse(chart_img.read(),
                mimetype=chart_img.info().type)
        except AttributeError:
            return HttpResponseNotFound("Dataset ID #{}"
                " does not exist.".format(datasetID))


@csrf_exempt
class DatasetCorrelationView(RestView):
    """This class defines views for REST URL:
        /dataset/<datasetID>/corr/<reporterID>/?co=

       Run Pearson correlation for provided reporter
       against all reporters in dataset.
    """
    def get(self, request, datasetID, reporterID):
        try:
            min_corr = float(request.GET['co'])
        except KeyError:
            return HttpResponseNotFound("<b>No correlation value provided.</b>"
                "<br />Please provide a correlation cutoff value in the form"
                " of ?co=0.9, etc.")
        if min_corr < 0.5 or min_corr > 1:
            return HttpResponseForbidden(
                "Correlation threshold value must be between 0.5 and 1")
        datasetID = sanitize(datasetID)
        log.info('username=%s clientip=%s action=dataset_correlation id=%s',
            getattr(request.user, 'username', ''),
            request.META.get('REMOTE_ADDR', ''), datasetID)

        return render_to_formatted_response(request,
            data=DatasetQuery.get_ds_corr(datasetID, reporterID, min_corr),
            allowed_formats=['json', 'xml'])


@csrf_exempt
class DatasetD3View(RestView):
    """This class defines views for REST URL:
       /dataset/d3/<ds_id>/<rep_id>/
    """
    def get(self, request, ds_id, rep_id):
        dsd = get_object_or_404(BiogpsDatasetData, dataset=ds_id,
                                reporter=rep_id)
        ds_data = dsd.data

        ds = dsd.dataset
        ds_meta = ds.metadata
        is_internal_ds = not ds.geo_id_plat

        # Response object
        res = {'meta': {}, 'data': []}
        res_meta = res['meta']
        res_meta['id'] = ds_id
        res_meta['reporter'] = rep_id
        res_meta['display_params'] = ds_meta['display_params']
        res_meta['name'] = ds.name
        res_meta['species'] = ds.species
        res_meta['summary'] = ds_meta['summary']

        # Owner
        user = ds.ownerprofile.user
        res_meta['owner'] = {'id': user.id,
                             'name': user.get_full_name(),
                             'profile': user.get_absolute_url(),
                             'username': user.username}

        res_data = res['data']
        for idx, fact_dict in enumerate(ds_meta['factors']):
            samp_id = fact_dict.keys()[0]
            samp_val = ds_data[idx]

            # Add data value to response
            val_dict = fact_dict[samp_id]
            data_dict = {'factors': {}, 'sample': samp_id, 'value': samp_val}

            # Make all keys lowercase, add factors to samples
            skip_factors = ['sample', 'value']
            for key, val in val_dict.iteritems():
                key = key.lower()
                if key == 'title':
                    data_dict[key] = val
                    if is_internal_ds:
                        data_dict['factors']['tissue'] = val
                elif key not in skip_factors:
                    data_dict['factors'][key] = val
                else:
                    data_dict[key] = val

            res_data.append(data_dict)

        return render_to_formatted_response(request, data=res,
            allowed_formats=['json', 'xml'])
