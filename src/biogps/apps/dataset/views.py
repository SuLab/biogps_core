from biogps.apps.dataset.models import BiogpsDatasetData
from biogps.apps.dataset.utils import DatasetQuery, sanitize
from biogps.utils.http import JSONResponse, render_to_formatted_response
from biogps.utils.restview import RestView
from django.http import (
    HttpResponse,
    HttpResponseForbidden,
    HttpResponseNotFound
    )
from django.shortcuts import render_to_response
from django.views.decorators.csrf import csrf_exempt
from time import time
import logging


log = logging.getLogger('biogps_prod')


@csrf_exempt
class DatasetView(RestView):
    """This class defines views for REST URL:
       /dataset/<datasetID>/?format=

       Return all metadata for a dataset.
       ** Note: eventually change this to behave
       ** more like the PluginView.
    """
    def get(self, request, datasetID, slug=None):
        """Get a specific plugin page/object via GET
           format = html (default)    display plugin details page
                    json              return a plugin object in json format
                    xml               return a plugin object in xml format
        """
        datasetID = sanitize(datasetID)
        log.info('username=%s clientip=%s action=dataset_metadata id=%s',
            getattr(request.user, 'username', ''),
            request.META.get('REMOTE_ADDR', ''), datasetID)

        if 'format' in request.GET:
            meta = DatasetQuery.get_ds_metadata(datasetID)
            sort_fac = request.GET.get('sortFactor', None)
            if sort_fac is not None:
                # Sort metadata by provided factor
                try:
                    meta['factors'].sort(key=lambda x: x.values()[0][sort_fac])
                except KeyError:
                    pass

            return render_to_formatted_response(request,
                data=meta, allowed_formats=['json', 'xml'])
        else:
            # Standard HTML request, blank response until DS Library in place
            return HttpResponse()


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
        return JSONResponse(json_response)


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
        if _format is not None:
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
        return render_to_formatted_response(request,
            data=DatasetQuery.get_ds_corr(datasetID, reporterID, min_corr),
            allowed_formats=['json', 'xml'])
