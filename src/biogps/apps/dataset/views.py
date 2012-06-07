from __future__ import division
from collections import OrderedDict
from django.conf import settings
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http import HttpResponse, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt
from django.utils.encoding import smart_str
from biogps.apps.search.es_lib import ESPages
from biogps.utils.http import JSONResponse
from biogps.utils.restview import RestView
from json import loads
from math import ceil, floor, sqrt
from operator import itemgetter
from pyes import ES, ANDFilter, FilteredQuery, HasChildQuery, QueryFilter, StringQuery, TermFilter, TermsQuery
from pyes.exceptions import (NotFoundException, IndexMissingException,
                             ElasticSearchException)
from StringIO import StringIO
from time import time
import csv
import numpy as np
import psycopg2
import sys
import urllib

from biogps.apps.dataset.models import BiogpsDataset, BiogpsDatasetData, BiogpsDatasetMatrix


def mean(values):
    # Return avg of list of values
    try:
        avg = round(sum(values)/len(values), 3)
    except ZeroDivisionError:
        return 0
    return avg

def median(values):
    # Return median of list of values
    vals = sorted(values)
    count = len(vals)
    mdn = 0
    try:
        if count % 2 == 1:
            mdn = vals[int((count+1)/2) - 1]
        else:
            lower = vals[int(count/2) - 1]
            upper = vals[int(count/2)]
            mdn = round((lower + upper)/2, 3)
    except ZeroDivisionError:
        return mdn
    return mdn

def std_err(values):
    # Return standard error of values
    avg = mean(values)
    count = len(values)
    try:
        std_dev = sqrt(sum([(i - avg)**2 for i in values]) / (count - 1))
    except ZeroDivisionError:
        std_dev = sqrt(sum([(i - avg)**2 for i in values]) / count)
    std_err = std_dev / sqrt(count)
    return std_err


class DatasetQuery():
    '''Generic class container for dataset query functions'''
    @staticmethod
    def get_obj(ds_model, *vals, **filters):
        '''**Currently unused/untested** Helper method for generic queries.
           If querying for values pass list of values. Filters including
           exact matches are passed as dict eg.
           {'dataset__exact': 100, 'reporter__in': ['1007_s_at', '1053_at']}
        '''
        if vals:
            return ds_model.objects.get(**filters).values(*vals)
        else:
            return ds_model.objects.get(**filters)

    @staticmethod
    def get_default_ds(rep_li, q_term=None):
        '''Return default datasets'''
        conn = ES(settings.ES_HOST[0], timeout=10.0)
        kwargs = {'doc_types': 'dataset', 'indices': 'biogps_dataset', 'fields': 'id,name'}
        t_query = TermsQuery('reporter', rep_li.strip(' ').split(','))
        base_query = HasChildQuery(type='by_reporter', query=t_query)
        f_query = FilteredQuery(base_query, ANDFilter([TermFilter('default', [True])]))

        if q_term is not None:
            # Filter search results with query string
            q_filter = QueryFilter(query=StringQuery(query=q_term+'*'))
            res = conn.search(query=FilteredQuery(f_query, q_filter), size='100', **kwargs)
        else:
            res = conn.search(query=f_query, size='100', **kwargs)
        try:
            # Sort results on ID
            res_sorted = sorted(res['hits']['hits'], key=lambda k: k['fields']['id'])
            return [ds['fields'] for ds in res_sorted]
        except KeyError:
            # Likely empty response
            return list()

    @staticmethod
    def get_ds_li(rep_li):
        '''Return dataset list for provided reporters'''
        conn = ES(settings.ES_HOST[0], timeout=10.0)
        t_query = TermsQuery('reporter', rep_li.strip(' ').split(','))
        # *** No spaces between field names. Undocumented and important! ***
        res = conn.search(query=HasChildQuery(type='by_reporter',
                                  query=t_query), **{'fields': 'id,name'})
        try:
            return [ds['fields'] for ds in res['hits']['hits']]
        except KeyError:
            # Likely empty response
            return list()

    @staticmethod
    def get_ds_page(rep_li, page, q_term=None):
        '''Return page of dataset results for provided query type and terms'''
        all_results = list()
        # *** No spaces between field names. Undocumented and important! ***
        kwargs = {'doc_types': 'dataset', 'indices': 'biogps_dataset', 'fields': 'id,name'}
        t_query = TermsQuery('reporter', rep_li.strip(' ').split(','))
        base_query = HasChildQuery(type='by_reporter', query=t_query)

        if q_term is not None:
            # Filter search results with query string
            q_filter = QueryFilter(query=StringQuery(query=q_term+'*'))
            all_results = ESPages(FilteredQuery(base_query, q_filter), **kwargs)
        else:
            all_results = ESPages(base_query, **kwargs)

        # Now have total number of results, use Django paginator example at:
        # https://docs.djangoproject.com/en/dev/topics/pagination/#using-paginator-in-a-view
        paginator = Paginator(all_results, 15)
        try:
            _datasets = paginator.page(int(page))
        except (PageNotAnInteger, ValueError):
            # If page is not an integer, deliver first page.
            _datasets = paginator.page(1)
        except EmptyPage:
            # If page is out of range (e.g. 9999), deliver last page of results.
            _datasets = paginator.page(paginator.num_pages)
        return (all_results.count(), paginator.num_pages, _datasets.object_list)

    @staticmethod
    def get_mygene_reps(gene_id):
        '''Return reporter list for provided gene'''
        rep_li = list()
        mygene_res = urllib.urlopen('http://mygene.info/gene/{}/'\
                                    '?filter=entrezgene,reporter,'\
                                    'refseq.rna'.format(gene_id))
        if mygene_res.getcode() == 200:
            _results = loads(mygene_res.read())
            rep_dict = _results['reporter']
            for key in rep_dict.keys():
                for val in rep_dict[key]:
                    rep_li.append(val)
        return ','.join(rep_li)
     
    @staticmethod
    def get_ds_metadata(ds_id):
        '''Return dataset metadata for provided ID'''
        try:
            return BiogpsDataset.objects.get(id=ds_id).metadata
        except BiogpsDataset.DoesNotExist:
            return None
     
    @staticmethod
    def get_ds_data(ds_id, rep_li, gene_id, _format):
        '''Return dataset data for provided ID and reporters'''
        ds_name = ''
        rep_dict = OrderedDict()
        try:
            dsd = BiogpsDatasetData.objects.filter(dataset=ds_id, reporter__in=rep_li)
        except BiogpsDatasetData.DoesNotExist:
            return None
        if _format is not None:
            _format = _format.lower()
            if _format == 'csv':
                # CSV output
                _res = HttpResponse(mimetype='text/csv')
                if gene_id is not None:
                    _res['Content-Disposition'] = 'attachment; filename=dataset_{}_gene_{}.csv'.format(ds_id, gene_id)
                else:
                    _res['Content-Disposition'] = 'attachment; filename=dataset_{}.csv'.format(ds_id)

                # Write csv results
                w = csv.writer(_res)

                # Column titles
                col_titles = ['Tissue'] + rep_li
                w.writerow(col_titles)

                _factors = BiogpsDataset.objects.get(id=ds_id).metadata['factors']
                samp_names = [i.keys()[0] for i in _factors]
                for idx, val in enumerate(samp_names):
                    csv_row = list()
                    csv_row.append(val.rsplit('.', 1)[0])
                    for i in dsd:
                        csv_row.append(i.data[idx])
                    w.writerow(csv_row)

                return _res
        else:
            # Default json output
            for i in dsd:
                ds_name = i.dataset.name
                rep_dict[i.reporter] = i.data
            probeset_list = [{i: {"values": rep_dict[i]}} for i in rep_dict]
            return OrderedDict([('id', ds_id), ('name', ds_name), ('probeset_list', probeset_list)])
     
    @staticmethod
    def get_ds_chart(ds_id, rep_id):
        '''Return dataset static chart URL for provided ID and reporter'''
        try:
            rep_data = BiogpsDatasetData.objects.get(dataset=ds_id, reporter=rep_id)
        except BiogpsDatasetData.DoesNotExist:
            return None

        # Probset values sorted by order index
        ps_values = rep_data.data
        ps_mean = mean(ps_values)
        ps_median_flt = median(ps_values)
        ps_median_int = int(ps_median_flt)
        ps_median_x10 = 0
        ps_median_x30 = 0
        ps_min = int(min(ps_values))
        ps_max = int(max(ps_values))

        # Get dataset metadata
        m = rep_data.dataset.metadata
        ds_factors = zip(m['factors'], ps_values)

        ds_params = m['display_params']
        try:
            _agg = ds_params['aggregate'][0]
        except IndexError:
            # No aggregate display param
            _agg = None
        try:
            _sort = ds_params['sort'][0]
        except IndexError:
            _sort = None
        try:
            _color = ds_params['color'][0]
        except IndexError:
            _color = None

        if _agg:
            # Parse data values, handle replicates based on 'aggregate' param

            # agg_list is same format and order as ds_factors:
            # [{'aggregate_title': {'order_idx': 1, ...}}, etc]
            agg_list = list()

            # agg_dict stores the sum and numbers of replicate data in
            # ps_values: {'rep': [sum, number of replicates]}
            agg_dict = dict()

            # Temp list to track what's already been aggregated
            agg_vals = list()

            for idx, smp_dict in enumerate(ds_factors):
                smp_dict_vals = smp_dict[0].values()[0]
                agg_val = smp_dict_vals[_agg]

                if agg_val not in agg_vals:
                    # New sample aggregate
                    agg_vals.append(agg_val)
                    agg_dict[agg_val] = [ps_values[idx], 1]
                    # Append full sample metadata for possible use in
                    # sorting and coloring 
                    agg_list.append({agg_val: smp_dict_vals})
                else:
                    # Only using first-encountered replicate's metadata,
                    # just update aggregated data values
                    agg_dict[agg_val][0] += ps_values[idx]
                    agg_dict[agg_val][1] += 1

            # Condense ps_values to avg per replicate group
            agg_sums = dict()
            for i in agg_dict:
                agg_nums = agg_dict[i]
                agg_sums[i] = round(agg_nums[0]/agg_nums[1], 2)

            # Combine aggregate metadata with data average 
            for smp_dict in agg_list:
                smp_dict.values()[0]['data'] = agg_sums[smp_dict.keys()[0]]

            ds_factors = agg_list
        else:
            # No aggregation, construct list of dicts in same format as if
            # there had been aggregation
            _tmp = list()
            for idx, smp_dict in enumerate(ds_factors):
                smp_dict_vals = smp_dict[0].values()[0]
                smp_dict_vals['data'] = smp_dict[1]
                _tmp.append({smp_dict_vals['title']: smp_dict_vals})
            ds_factors = _tmp

        if _sort:
            ds_factors.sort(key=lambda x: x.values()[0][_sort])

        # Colors taken from GNF chart service
        color_codes = ['9400D3', '2F4F4F', '483D8B', '8FBC8B', 'E9967A', '8B0000', '9932CC', 'FF8C00', '556B2F', '8B008B', 'BDB76B', '7FFFD4', 'A9A9A9', 'B8860B', '008B8B', '00008B', '00FFFF', 'DC143C', '6495ED', 'FF7F50', 'D2691E', '7FFF00', '5F9EA0', 'DEB887', 'A52A2A', '8A2BE2', '0000FF', '000000', 'FFE4C4', '006400', '00FFFF']
        if _color:
            # Color groupings
            color_groups = list()
            color_idx = 0
            prev_color = ''
            for idx, smp_dict in enumerate(ds_factors):
                current_color = smp_dict.values()[0][_color]
                if idx == 0:
                    prev_color = current_color
                    color_groups.append(color_codes[0])
                else:
                    if current_color == prev_color:
                        color_groups.append(color_groups[-1])
                    else:
                        prev_color = current_color
                        color_idx += 1
                        try:
                            color_groups.append(color_codes[color_idx])
                        except IndexError:
                            # Rewind to beginning of colors
                            prev_color, color_idx = 0, 0
                            color_groups.append(color_codes[0])
            chart_colors = '|'.join(color_groups)
        else:
            # No coloring info - single color
            chart_colors = color_codes[-1]

        # Set chart min, max value to a nice round number
        if ps_min > 0:
            chart_min_val = 0
        elif ps_min < -100:
            # Nearest hundred
            chart_min_val = int(floor( round((ps_min * 1.15)/100, 2) ) * 100)
        elif ps_min < -50:
            chart_min_val = int(floor( round((ps_min * 1.15)/100, 2) ) * 50)
        else:
            chart_min_val = int(floor( round((ps_min * 1.15)/100, 2) ) * 10)
        if ps_max < 10:
            chart_max_val = int(ceil( round((ps_max * 1.15)/100, 2) ) * 10)
        elif ps_max < 50:
            chart_max_val = int(ceil( round((ps_max * 1.15)/100, 2) ) * 50)
        else:
            chart_max_val = int(ceil( round((ps_max * 1.15)/100, 2) ) * 100)
        check_x10 = ps_median_int * 10
        if check_x10 > chart_min_val and check_x10 < chart_max_val:
            ps_median_x10 = check_x10
        check_x30 = ps_median_int * 30
        if check_x30 > chart_min_val and check_x30 < chart_max_val:
            ps_median_x30 = check_x30

        # Format data for posting to Google Charts
        # Google Chart API documentation at
        # http://code.google.com/apis/chart/image/docs/making_charts.html
        chart_url = 'https://chart.googleapis.com/chart'
        chart_size_w = '370'
        if len(ps_values) > 180:
            chart_size_h = '810'
            y_axis_label_size = 5
        else:
            chart_size_h = '772'
            y_axis_label_size = 9
        chart_size = '%sx%s' % (chart_size_w, chart_size_h)
        chart_type = 'bhg'
        chart_data = 't:%s' % ','.join(str(smp_dict.values()[0]['data']) for idx, smp_dict in enumerate(ds_factors))
        chart_title = rep_id
        chart_title_style = '000000,16'
        chart_axes = 'x,y,r,t,x'
        chart_x_t_axes_range = '0,%s,%s|4,%s,%s' % (chart_min_val, chart_max_val, chart_min_val, chart_max_val)

        # Chart x and top axis labels
        if chart_min_val < 0:
            x_t_min_label = chart_min_val
        else:
            x_t_min_label = 0
        if chart_min_val == -chart_max_val:
            x_t_mid_label = 0
        else:
            x_t_mid_label = int(round(chart_max_val/2))
        x_t_labels = '%s|%s|%s' % (x_t_min_label, x_t_mid_label, chart_max_val) 
        x_labels = '0:|%s' % x_t_labels
        # Use Django's smart_str for non-English characters, encoding in UTF-8
        y_labels = [smart_str(smp_dict.values()[0]['title']) for smp_dict in ds_factors]
        # The order for Google Charts data and labels are opposite... yeah
        y_labels = '1:|%s' % '|'.join(reversed(y_labels))
        r_labels = '2:|'
        t_labels = '3:|%s' % x_t_labels
        median_label = 'Median(%s)' % round(ps_median_flt, 2)
        if ps_median_x10 and ps_median_x30:
            x2_labels = '4:|%s|10xM|30xM' % median_label
        elif ps_median_x10:
            x2_labels = '4:|%s|10xM' % median_label
        else:
            x2_labels = '4:|%s' % median_label
        chart_axes_labels = '%s' % '|'.join([x_labels, y_labels, r_labels, t_labels, x2_labels])
        chart_bar_width_spacing = 'a,2,2'
        chart_axes_tick_lengths = '2,0|3,0|4,-%s' % chart_size_h
        chart_axes_label_styles = '0,000000,12,0,lt,000000,000000|1,000000,%s,1,lt,000000,000000|2,000000|3,000000,12|4,990066,11,0,lt,990066' % y_axis_label_size
        chart_data_scale = '%s,%s' % (chart_min_val, chart_max_val)
        chart_grid_lines = '25,100,1,5'
        if ps_median_x10 and ps_median_x30:
            chart_median_label_positions = '4,%s,%s,%s' % (ps_median_int, ps_median_x10, ps_median_x30)
        elif ps_median_x10:
            chart_median_label_positions = '4,%s,%s' % (ps_median_int, ps_median_x10)
        else:
            chart_median_label_positions = '4,%s' % (ps_median_int)

        params = urllib.urlencode({'chs': chart_size,
                                   'cht': chart_type,
                                   'chd': chart_data,
                                   'chco': chart_colors,
                                   'chtt': chart_title,
                                   'chts': chart_title_style,
                                   'chxt': chart_axes,
                                   'chxr': chart_x_t_axes_range,
                                   'chxl': chart_axes_labels,
                                   'chbh': chart_bar_width_spacing,
                                   'chxtc': chart_axes_tick_lengths,
                                   'chxs': chart_axes_label_styles,
                                   'chds': chart_data_scale,
                                   'chg': chart_grid_lines,
                                   'chxp': chart_median_label_positions
                                  })
        return urllib.urlopen(chart_url, params)
     
    @staticmethod
    def get_ds_corr(ds_id, rep_id, min_corr):
        '''Return NumPy correlation matrix for provided ID, reporter,
           and correlation coefficient
        '''
        def pearsonr(v, m):
            # Pearson correlation calculation taken from NumPy's implementation
            v_m = v.mean()
            m_m = m.mean(axis=1)
            r_num = ((v-v_m) * (m.transpose()-m_m).transpose()).sum(axis=1)
            r_den = np.sqrt(((v-v_m)**2).sum() * (((m.transpose()-m_m).transpose())**2).sum(axis=1))
            r = r_num/r_den
            return r

        # Reconstruct dataset matrix
        try:
            _matrix = BiogpsDatasetMatrix.objects.get(dataset=ds_id)
        except BiogpsDatasetMatrix.DoesNotExist:
            return None
        reporters = _matrix.reporters

        # Get position of reporter
        if rep_id in reporters.keys():
            rep_pos = reporters[rep_id]

            # Pearson correlations for provided reporter
            matrix_data = np.load(StringIO(_matrix.matrix))
            rep_vector = matrix_data[rep_pos]
            corrs = pearsonr(rep_vector, matrix_data)

            # Get indices of sufficiently correlated reporters
            idx_corrs = np.where(corrs > min_corr)[0]

            # Get values for those indices
            val_corrs = corrs.take(idx_corrs)

            # Return highest correlated first
            corrs = zip(val_corrs, idx_corrs)
            corrs.sort(reverse=True)
            return [{'Reporter': reporters[str(i[1])], 'Value': round(i[0], 4)} for i in corrs]


@csrf_exempt
class DatasetView(RestView):
    '''This class defines views for REST URL:
       /dataset/<datasetID>/?format=

       Return all metadata for a dataset.
       ** Note: eventually change this to behave
       ** more like the PluginView.
    '''
    def get(self, request, datasetID, slug=None):
        '''Get a specific plugin page/object via GET
           format = html (default)    display plugin details page
                    json              return a plugin object in json format
                    xml               return a plugin object in xml format
        '''
        meta = DatasetQuery.get_ds_metadata(datasetID)
        if meta: 
            # If dataset has ordering information,
            # sort according to it
            try:
                meta['factors'].sort(key=lambda x: x.values()[0]['order_idx'])
            except KeyError:
                pass
            return JSONResponse(meta)
        else:
            return HttpResponseNotFound("Dataset ID #{} does not exist.".format(datasetID));


@csrf_exempt
class DatasetSearchView(RestView):
    '''This class defines views for REST URL:
        /dataset/search/

       Given a list of reporters, return the datasets
       that contain them.

       Given a gene ID, return the relevant datasets,
       dataset names, and reporters.

       Given a query term, return the relevant datasets.
    '''
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
                    json_response = DatasetQuery.get_ds_page(rep_li, page, q_term)

        if dbug:
            search_end = time()
            json_response += ['DEBUG:', 'Search {} secs'.format(round(search_end-search_start, 3))]
        return JSONResponse(json_response)


@csrf_exempt
class DatasetValuesView(RestView):
    '''This class defines views for REST URL:
        /dataset/<datasetID>/values/?reporters=...(&gene=)(&format=)
    '''
    def get(self, request, datasetID):
        try:
            get_reporters = [i for i in request.GET['reporters'].split(',')]
        except KeyError:
            return HttpResponseNotFound('<b>No reporters provided.</b>'\
                                        '<br />Please provide reporters '\
                                        'in the form of ?reporters=rep1,rep2')
        gene_id = request.GET.get('gene', None)
        _format = request.GET.get('format', None)
        res = DatasetQuery.get_ds_data(datasetID, get_reporters, gene_id, _format)
        if _format is not None:
            return res
        else:
            return JSONResponse(res)


@csrf_exempt
class DatasetStaticChartView(RestView):
    '''This class defines views for REST URL:
        /dataset/<datasetID>/chart/<reporterID>/

       Given a dataset ID and reporter,
       return the static chart image.
    '''
    def get(self, request, datasetID, reporterID):
        chart_img = DatasetQuery.get_ds_chart(datasetID, reporterID)
        try:
            return HttpResponse(chart_img.read(), mimetype=chart_img.info().type) 
        except AttributeError:
            return HttpResponseNotFound("Dataset ID #{} does not exist.".format(datasetID));


@csrf_exempt
class DatasetCorrelationView(RestView):
    '''This class defines views for REST URL:
        /dataset/<datasetID>/corr/<reporterID>?co=

       Run Pearson correlation for provided reporter
       against all reporters in dataset.
    '''
    def get(self, request, datasetID, reporterID):
        try:
            min_corr = float(request.GET['co'])
        except KeyError:
            return HttpResponseNotFound("<b>No correlation value provided.</b>"\
                                        "<br />Please provide a correlation cutoff"\
                                        " value in the form of ?co=0.9, etc.")
        return JSONResponse(DatasetQuery.get_ds_corr(datasetID, reporterID, min_corr))
