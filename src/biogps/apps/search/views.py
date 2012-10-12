import re
from django.http import HttpResponseBadRequest

from biogps.utils.helper import HttpResponseRedirectWithIEFix
from biogps.utils.http import JSONResponse, render_to_formatted_response
from biogps.utils.models import Species
from biogps.apps.search.navigations import BiogpsSearchNavigation
from es_lib import ESQuery

import logging
log = logging.getLogger('biogps_prod')


def status(request):
    '''This view is for debug or ES server monitoring purpose.'''
    if request.method in ['GET', 'HEAD']:
        es = ESQuery()
        status = es.status()
        return JSONResponse(status)


def _handle_commom_params(params):
    '''handles common params from QueryDict <params> (e.g. request.GET).'''
    q = params.get('q', None)

    # Figure out the type(s) of objects we're looking for
    # 1) Check the params hash directly (i.e. if it came from a URL param)
    types = params.get('in', None)

    # 2) Check the query string contents
    if not types and q:
        pattern = 'in:([\w,]+)'
        _q = re.search(pattern, q)
        if _q:
            types = _q.group(1)
            q = re.sub(pattern, '', q).strip()

    if not types:
        # No match, set to gene which will route to V1 search in search funtion
        types = 'gene'

    # Ensure types finishes as an array
    if types is not None:
        types = [x.strip() for x in types.split(',')]


    # Handle tag and species filtering
    _filters = ['tag', 'species']
    filter_by = {}
    for f in _filters:
        # 1) Check the params hash directly
        _f = params.get(f, None)
        # 2) Check the query string contents
        if not _f and q:
            pattern = f + ':([\w,]+)'
            _q = re.search(pattern, q)
            if _q:
                _f = _q.group(1)
                q = re.sub(pattern, '', q).strip()
        # If we've found something, add it to our filter list
        if _f:
            filter_by[f] = _f

    # Paging parameters
    start = params.get('from', None)
    if not start:
        start = params.get('start', 0)
    size = params.get('size', None)
    if not size:
        size = params.get('limit', 10)
    explain = params.get('explain', None) == 'true'

    # Sorting parameter translation. Defaults to popularity
    sort_param = params.get('sort', '')
    #  handle some special sort cases
    if sort_param == 'popular':    # e.g. /plugin/all/?sort=popular
        sort = [{'popularity':'desc'}]
    elif sort_param == 'newest':   # e.g. /plugin/all/?sort=newest
        sort = [{'created':'desc'}]
    else:
    # other generic sort case
        sort = [s.strip() for s in params.get('sort', '').split(',')]
        sort = [{s[1:]: 'desc'} if s[0]=='-' else s for s in sort if s]
    if not sort:
        sort = [{'popularity':'desc'}]

    # Fields to return for each object. Defaults to _source
    fields = [s.strip() for s in params.get('fields', '_source').split(',')]


    f = [x.strip() for x in params.get('f', '').split(',') if x.strip() != '']  # facets fields
    h = [x.strip() for x in params.get('h', '').split(',') if x.strip() != '']  # hl_fields

    return dict(only_in=types, q=q, filter_by=filter_by, fields=fields,
                start=start, size=size, sort=sort, h=h, facets=f, explain=explain)


def list(request, *args, **kwargs):
    common_params = _handle_commom_params(kwargs)

    # Add breadcrumbs based on the filters
    for f,fv in common_params.get('filter_by').items():
        request.breadcrumbs( f.capitalize() +': '+ fv.capitalize(), '/'.join(['','plugin',f,fv,'']) )
    if not common_params['filter_by']:
        request.breadcrumbs( 'All Plugins', '/plugin/all/' )

    es = ESQuery(request.user)
    res = es.query(**common_params)

    # Set up the navigation controls
    nav = BiogpsSearchNavigation(request, type='list', es_results=res, params=common_params)

    # Do the basic page setup and rendering
    html_template = 'plugin/list.html'
    html_dictionary = {
        'items': res,
        'species': Species,
        'navigation': nav
    }
    return render_to_formatted_response(request,
                                        data=res,
                                        allowed_formats=['html','json','xml'],
                                        model_serializer='object_cvt',
                                        html_template=html_template,
                                        html_dictionary=html_dictionary)


def search(request, _type=None):
    '''The view function for urls:
          /search/?q=cdk2
          /search/plugin/?q=cancer
          /search/layout/?q=pathway
          /search/?q=cancer&in=plugin
          /search/?q=pathway2&in=layout
          /search/?q=cancer&in=plugin,gene

          /search/plugin/?q=cancer&from=10&size=10

          /search/plugin/?q=cancer&sort=id

       Note that un-recognized _type string is ignored, if no valid _type is
         passed, the search is against all types.

    '''
    common_params = _handle_commom_params(request.GET)
    format = request.GET.get('format', 'html')

    q = request.GET.get('q', '')

    if _type:
        common_params['only_in'] = [_type]

    # For now V2 search does not support genes
    if format == 'html' and common_params['only_in'] == ['gene']:
        # Redirect the user to the V1 search engine
        _url = '/?query=' + q
        return HttpResponseRedirectWithIEFix(request, _url)

    es = ESQuery(request.user)
    res = es.query(**common_params)

    #logging query stat
    if res.has_error():
        logmsg = 'action=es_query in=%s query=%s qlen=%s, error=1, errormsg=%s' % \
                 (','.join(common_params['only_in']),
                  q[:1000],   # truncated at length 1000
                  len(q),
                  res.error)
    else:
        logmsg = 'action=es_query in=%s query=%s qlen=%s, num_hits=%s, total=%s' % \
                 (','.join(common_params['only_in']),
                  q[:1000],   # truncated at length 1000
                  len(q),
                  res.hits.hit_count,
                  len(res))
    log.info(logmsg)

    # Set up the navigation controls
    nav = BiogpsSearchNavigation(request, type='search', es_results=res, params=common_params)

    # Do the basic page setup and rendering
    request.breadcrumbs( 'Plugin Library', '/plugin/' )
    request.breadcrumbs( 'Search Results', request.path_info )
    html_template = 'plugin/list.html'
    html_dictionary = {
        'items': res,
        'species': Species,
        'navigation': nav
    }
    if res.has_error():
        html_dictionary['items'] = None
        html_dictionary['error'] = res.error
    return render_to_formatted_response(request,
                                        data=res,
                                        allowed_formats=['html','json','xml'],
                                        model_serializer='object_cvt',
                                        html_template=html_template,
                                        html_dictionary=html_dictionary)


def interval(request):
    chr = request.GET.get('chr', None)
    gstart = request.GET.get('gstart', None)
    gend = request.GET.get('gend', None)
    taxid = request.GET.get('taxid', None)
    species = request.GET.get('species', None)
    assembly = request.GET.get('assembly', None)

    if not chr or not gstart or not gend or \
      (not taxid and not species and not assembly):
        return HttpResponseBadRequest("Missing required parameters.")

    common_params = _handle_commom_params(request.GET)

    es = ESQuery(request.user)
    res = es.query_gene_by_interval(chr, gstart, gend,
                                    taxid, species, assembly,
                                    **common_params)
    return JSONResponse(res.object_cvt())

def get_mapping(request):
    es = ESQuery(request.user)
    return JSONResponse(es.conn.get_mapping())
