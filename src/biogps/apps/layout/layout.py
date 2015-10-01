from django.db.models import Q
from django.core.serializers import serialize, get_serializer_formats
from django.utils.encoding import smart_unicode, smart_str
from django.http import HttpResponse, HttpResponseBadRequest
from django.utils.html import escape

from models import BiogpsGenereportLayout
from biogps.apps.plugin.models import BiogpsPlugin
from biogps.utils.helper import (MIMETYPE, STD_FORMAT, ANONYMOUS_USER_ERROR, ExtError, JSONResponse,
                                 setObjectPermission, loginrequired, formatDateTime, cvtPermission,
                                 is_valid_geneid, allowedrequestmethod, json)
from biogps.utils import log
from biogps.apps.plugin.plugin import PluginUrlRenderError
from biogps.apps.boe.views import MyGeneInfo


#TEMP
#NEW_LAYOUT_MODE = True    #0: for old layou_data jsonfield; 1 for new manytomanyfield


#@loginrequired
def layout(request, query=None):
    #this should be deprecated.
    """ /layout/all/
        /layout/1/
        /layout/3-9/
        /layout/1,3,5/
        /layout/first/
        /layout/last/
        optional querystrings for GET:
            q:      can be 1,
                       1,3,5
                       3-9
                       all
                       first
                       last
            format: json, xml, plainjson, python
            loadplugin: if true ("1" or "true"), load associated plugin data in returned layout data

    """

    if request.method == 'GET':
        if request.GET.has_key('q'):
            query = request.GET['q']

        if query:
            query = query.lower()
            if query in ['all', 'first', 'last']:
                if request.user.is_anonymous():
                    query_result = get_shared_layouts(request.user)
                else:
                    query_result = getall(request.user, userselectedonly=False)
                if query_result.count() > 0:
                    if query == 'first':
                        query_result = query_result[0:1]
                    elif query == 'last':
                        query_result = query_result[query_result.count() - 1:]
            else:
                try:
                    if query.find(',') != -1:
                        layout_id = [int(x) for x in query.split(',')]
                    elif query.find('-') != -1:
                        start, end = [int(x) for x in query.split('-')][:2]
                        layout_id = [str(x) for x in range(start, end + 1)]
                    else:
                        layout_id = [int(query)]
                except ValueError:
                    return HttpResponseBadRequest('Invalid input parameters!')

                query_result = BiogpsGenereportLayout.objects.filter(pk__in=layout_id)

            loadplugin = (request.GET.get('loadplugin', '').lower() in ['1', 'true'])

#            if NEW_LAYOUT_MODE:
            for layout in query_result:
                layout.author = layout.owner.get_valid_name()
                layout.is_shared = (layout.owner != request.user)
                layout.loadplugin = loadplugin
            extra_itemfields = ['author', 'is_shared', 'layout_data']
            query_total_cnt = query_result.count()

            #logging layout access
            log.info('username=%s clientip=%s action=layout_query id=%s',
                        getattr(request.user, 'username', ''),
                        request.META.get('REMOTE_ADDR', ''),
                        ','.join([str(layout.id) for layout in query_result]))

        else:
            return HttpResponseBadRequest('Missing required parameter.')

        format = request.GET.get('format', 'json')
        if format not in get_serializer_formats():
            format = 'json'
        if format == 'json':
            #return HttpResponse(serialize('jsonfix', query_result),mimetype=MIMETYPE.get(format, None))
            return HttpResponse(serialize('myjson', query_result, extra_fields={'totalCount': query_total_cnt}, extra_itemfields=extra_itemfields), mimetype=MIMETYPE.get(format, None))
        else:
            return HttpResponse(serialize(STD_FORMAT.get(format, format), query_result), mimetype=MIMETYPE.get(format, None))

    elif request.method == 'POST':
        if request.user.is_anonymous():
            return HttpResponse(json.dumps(ANONYMOUS_USER_ERROR), mimetype=MIMETYPE['json'])

        if query == 'add':
            return _layout_add(request)
        elif query == 'update':
            return _layout_update(request)
        elif query == 'delete':
            return _layout_delete(request)
        else:
            return HttpResponseBadRequest('Unsupported action "%s"' % escape(query))

    elif request.method == 'PUT':
        #update a record
        if request.user.is_anonymous():
            return HttpResponse(json.dumps(ANONYMOUS_USER_ERROR), mimetype=MIMETYPE['json'])

#        authorid = request.user.sid
#        layout_id = query
#        qdata = QueryDict(request.raw_post_data)
#        updatable_fields = ['layout_name', 'layout_data', 'description']  #'permission',
#        try:
#            layout = BiogpsGenereportLayout.objects.get(authorid=authorid, id=layout_id)
#            for f in updatable_fields:
#                if f in qdata:
#                    if f=='layout_data':
#                        try:
#                            setattr(layout, f, json.loads(qdata[f]))
#                        except ValueError:
#                            return ExtError('Passed "layout_data" is not a valid json string.')
#                    else:
#                        setattr(layout, f, qdata[f])
#            layout.save()
#            data = {'success': True}
#        except BiogpsGenereportLayout.DoesNotExist: #@UndefinedVariable
#            return ExtError("Layout does not exist.")
#            #data = {'success': False,
#            #        'errors': "Layout does not exist."}
#
#        return HttpResponse(json.dumps(data), mimetype=MIMETYPE['json'])

    elif request.method == 'DELETE':
        #delete a layout
        if request.user.is_anonymous():
            return HttpResponse(json.dumps(ANONYMOUS_USER_ERROR), mimetype=MIMETYPE['json'])

#        authorid = request.user.sid
#        layout_id = query
#        try:
#            layout = BiogpsGenereportLayout.objects.get(authorid=authorid, id=layout_id)
#            layout.delete()
#            data = {'success': True}
#        except BiogpsGenereportLayout.DoesNotExist: #@UndefinedVariable
#            return ExtError("Layout does not exist.")
#            #data = {'success': False,
#            #        'errors': "Layout does not exist."}
#
#        return HttpResponse(json.dumps(data), mimetype=MIMETYPE['json'])
#
    else:
        return HttpResponseBadRequest('Unsupported request method "%s"' % request.method)


@allowedrequestmethod('GET')
def layoutlist_all(request):
    """
    A simplified and much faster handler for layoutlist/all/ service.
    URL: /layoutlist/all/
    """
    user = request.user
    layout_qs = BiogpsGenereportLayout.objects.get_available(user, excludemine=True)
    layout_qs = layout_qs.order_by('-lastmodified')
    layout_list = list(layout_qs.values('pk', 'layout_name'))
    for i, layout in enumerate(layout_list):
        layout = {'pk': layout['pk'],
                  'fields': {'layout_name': layout['layout_name'],
                             'is_shared': True}}
        layout_list[i] = layout

    if not user.is_anonymous():
        my_layout_list = user.mylayouts.order_by('-lastmodified').values('pk', 'layout_name')
        my_layout_list = list(my_layout_list)
        for i, layout in enumerate(my_layout_list):
            layout = {'pk': layout['pk'],
                      'fields': {'layout_name': layout['layout_name'],
                                 'is_shared': False}}
            my_layout_list[i] = layout
        layout_list += my_layout_list

    layout_output = {"totalCount": len(layout_list),
                     "items": layout_list}

    return JSONResponse(layout_output)


#@loginrequired
@allowedrequestmethod('GET')
def layoutlist(request, query=None):
    """
    URL: /layoutlist/all/?userselected=1
         /layoutlist/all/?scope=my
         /layoutlist/all/?scope=shared
         /layoutlist/?search=demo
         /layoutlist/?search=demo&start=20&limit=10
    """

    if request.method == 'GET':
        sort_order = request.GET.get('dir', 'DESC')
        sort_by = request.GET.get('sort', 'lastmodified')
        sort_order = sort_order.strip()
        sort_by = sort_by.strip()
        if sort_order.upper() == 'DESC':
            sort_by = '-' + sort_by
        scope = request.GET.get('scope', 'all').lower()

#        userselectedonly = (request.GET.get('userselected','') == '1')
        userselectedonly = False     ##############TMP disable#############################################
                                     # tmp fix here, so that all user can pick up whatever is available ###
                                     ######################################################################

        #First, get all available layouts based on scope
        if (request.user.is_anonymous()):
            _dbobjects = get_shared_layouts(request.user, userselectedonly=False)
        else:
            if scope == 'my':
                _dbobjects = get_my_layouts(request.user)
            elif scope == 'shared':
                _dbobjects = get_shared_layouts(request.user, userselectedonly)
            else:
                #scope == 'all':
                #_dbobjects = get_my_layouts(request.adamuser) | get_shared_layouts(request.adamuser, userselectedonly)
                _dbobjects = getall(request.user, userselectedonly)

        #filter layouts based on search parameter
        if request.GET.has_key('search'):
            search_term = request.GET['search'].strip()
            _dbobjects = _dbobjects.order_by(sort_by).filter(Q(layout_name__icontains=search_term) |
                                                             Q(description__icontains=search_term) |
                                                             Q(author__icontains=search_term))

        else:
            _dbobjects = _dbobjects.order_by(sort_by)

        if request.GET.has_key('q'):
            query = request.GET['q']
        elif request.GET.has_key('query'):
            query = request.GET['query']
        if query:
            if query.lower() == 'all':
                query_result = _dbobjects
            else:
                try:
                    if query.find(',') != -1:
                        layout_id = [int(x) for x in query.split(',')]
                    elif query.find('-') != -1:
                        start, end = [int(x) for x in query.split('-')][:2]
                        layout_id = [str(x) for x in range(start, end + 1)]
                    else:
                        layout_id = [int(query)]
                except ValueError:
                    return HttpResponseBadRequest('Invalid input parameters!')

                query_result = _dbobjects.filter(pk__in=layout_id)
            query_total_cnt = query_result.count()

        elif request.GET.has_key('start'):
            start = request.GET['start']
            limit = request.GET.get('limit', _dbobjects.count())
            start = int(start)
            limit = int(limit)
            #query_result = BiogpsPlugin.objects.order_by(sort_by)[start:start+limit]
            query_result = _dbobjects[start:start + limit]
            query_total_cnt = _dbobjects.count()

        elif request.GET.has_key('search'):
            #in case that only query parameter is used.
            query_result = _dbobjects
            query_total_cnt = _dbobjects.count()

        else:
            return HttpResponseBadRequest('Missing required parameter.')

        for layout in query_result:
            layout.author = layout.owner.get_valid_name()
            layout.is_shared = (layout.owner != request.user)
        extra_itemfields = ['author', 'is_shared', 'layout_data']

        format = request.GET.get('format', 'json')
        if format not in get_serializer_formats():
            format = 'json'
        if format == 'json':
            #using specialized jsonserializer
            return HttpResponse(serialize('myjson', query_result, extra_fields={'totalCount': query_total_cnt}, extra_itemfields=extra_itemfields), mimetype=MIMETYPE.get(format, None))
        else:
            return HttpResponse(serialize(STD_FORMAT.get(format, format), query_result), mimetype=MIMETYPE.get(format, None))
        #return HttpResponse(serialize(STD_FORMAT.get(format, format), query_result),mimetype=MIMETYPE.get(format, None))


def get_my_layouts(user):
    if user.is_anonymous():
        return BiogpsGenereportLayout.objects.get_empty_query_set()
    else:
        #query_result = BiogpsGenereportLayout.objects.get_mine(authorid=adamuser.sid)
        query_result = user.mylayouts.all()
        return query_result


def get_shared_layouts(user, userselectedonly=False):
    if not userselectedonly:
        #query_result = BiogpsGenereportLayout.objects.get_shared2(user)
        query_result = BiogpsGenereportLayout.objects.get_available(user, excludemine=True)
    else:
        shared_layouts = user.profile.get('sharedlayouts', [])
        query_result = BiogpsGenereportLayout.objects.filter(id__in=shared_layouts).exclude(ownerprofile__sid=user.sid)

    return query_result


def getall(user, userselectedonly=False):
    """get all layouts available for given adamuser"""
    query_result = get_my_layouts(user) | get_shared_layouts(user, userselectedonly)
    return query_result


def getplugin(pid):
    plugin = {'id': pid}
    p = BiogpsPlugin.objects.get(pk=pid)
    for attr in ('title', 'url', 'type', 'author', 'description', 'lastmodified', 'options', 'created'):
        plugin[attr] = smart_str(getattr(p, attr))
    return plugin


def _layout_name_exists(layout_name, user):
#    exist_layouts = BiogpsGenereportLayout.objects.filter(  layout_name = layout_name,
#                                                            ownerprofile__sid = user.sid)
    exist_layouts = user.mylayouts.filter(layout_name=layout_name)
    return exist_layouts.count() > 0


@loginrequired
def _layout_add(request):
    #authorid = request.user.sid
    #ownerprofile = request.user.get_profile()
    #author = request.user.get_full_name() or request.user.username
    layout_name = smart_unicode(request.POST['layout_name'].strip())
    layout_data = request.POST['layout_data']
    #permission = request.POST.get('permission', '')
    description = smart_unicode(request.POST.get('description', ''))

    if _layout_name_exists(layout_name, request.user):
        return ExtError('Name conflicts with existed one!')

    else:
        layout = BiogpsGenereportLayout(layout_name=layout_name,
                                        #authorid = authorid,
                                        ownerprofile=request.user.get_profile(),
                                        #author = author,
                                        description=description)

        try:
            layout.save()
            layout.layout_data = json.loads(layout_data)

#            if NEW_LAYOUT_MODE:
#                layout.save()
#                layout.layout_data_new = json.loads(layout_data)
#            else:
#                layout.layout_data = json.loads(layout_data)
#                layout.save()
        except ValueError:
            return ExtError('Passed "layout_data" is not a valid json string.')

        #logging layout add
        log.info('username=%s clientip=%s action=layout_add id=%s',
                    getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    layout.id)
        data = {'success': True,
                'layout_id': layout.id}
    return JSONResponse(data)


@loginrequired
def _layout_update(request):

    layout_id = request.POST.get('layout_id', None)
    if not layout_id:
        return HttpResponseBadRequest('Missing required parameter.')

    rolepermission = request.POST.get('rolepermission', None)
    params = request.POST
    updatable_fields = ['layout_name', 'layout_data', 'description']      # 'permission',

    try:
        layout = request.user.mylayouts.get(id=layout_id)
        for f in updatable_fields:
            if f in params:
                if (f == 'layout_name') and (params[f] != layout.layout_name) and (_layout_name_exists(params[f], request.user)):
                    return ExtError('Name conflicts with existed one!')
                if (f == 'layout_data'):
                    try:
                        setattr(layout, f, json.loads(params[f]))
#                        if NEW_LAYOUT_MODE:
#                            setattr(layout, 'layout_data_new', json.loads(params[f]))
#                        else:
#                            setattr(layout, f, json.loads(params[f]))
                    except ValueError:
                        return ExtError('Passed "layout_data" is not a valid json string.')
                else:
                    setattr(layout, f, params[f])

#        #always update author column:
#        layout.author = request.user.get_full_name() or request.user.username

        layout.save()
        if rolepermission:
            setObjectPermission(layout, rolepermission)
            data = {'success': True}
        else:
            data = {'success': True}

    except BiogpsGenereportLayout.DoesNotExist:
        return ExtError("Layout does not exist.")

    return JSONResponse(data)


@loginrequired
def _layout_delete(request):
    #authorid = request.user.sid
    layout_id = request.POST['layout_id']
    try:
#        layout = BiogpsGenereportLayout.objects.get(authorid=authorid, id=layout_id)
        layout = request.user.mylayouts.get(id=layout_id)
        layout.delete()
        #logging layout delete
        log.info('username=%s clientip=%s action=layout_delete id=%s',
                    getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    layout_id)

        data = {'success': True}
    except BiogpsGenereportLayout.DoesNotExist:
        data = {'success': False,
                'error': "Layout does not exist."}

    return JSONResponse(data)


@loginrequired
def layout_tree(request):
    """This is a service for populate layout list in TreePanel.
       accepts parameter "node" for POST method.
                         "scope" ("my" or "shared")
    """
    if request.method == 'POST':
        node = request.POST.get('node', None)
        if not node:
            return HttpResponseBadRequest('Unsupported request method "%s"' % request.method)

        node = node.lower()
        children = []
        if node == 'root':
            children = [dict(text='My Layouts', id='/mylayout', cls='folder'),
                        dict(text='Shared Layouts', id='/sharedlayout', cls='folder')]
        elif node.split('/') == ['', 'mylayout']:
            #query_result = getall(request.adamuser)
            query_result = get_my_layouts(request.user)
            for _layout in query_result:
                child = dict(text=_layout.layout_name,
                             id='/mylayout/layout_' + str(_layout.id),
                             cls='folder',
                             layout_id=_layout.id,
                             layout_name=_layout.layout_name,
                             author=_layout.owner.get_valid_name(),
                             description=_layout.description,
                             rolepermission=cvtPermission(_layout.permission).get('R', None),
                             lastmodified=formatDateTime(_layout.lastmodified),
                             created=formatDateTime(_layout.created),
                             layout_scope='my',
                             #permission=_layout.permission,
                             )
                children.append(child)
        elif node.split('/') == ['', 'sharedlayout']:
            query_result = get_shared_layouts(request.user, userselectedonly=True)
#            shared_layouts = request.adamuser.profile.get('sharedlayouts', [])
#            query_result = BiogpsGenereportLayout.objects.filter(id__in=shared_layouts)
            for _layout in query_result:
                child = dict(text=_layout.layout_name,
                             id='/sharedlayout/layout_' + str(_layout.id),
                             cls='folder',
                             layout_id=_layout.id,
                             layout_name=_layout.layout_name,
                             author=_layout.owner.get_valid_name(),
                             description=_layout.description,
                             rolepermission=cvtPermission(_layout.permission).get('R', None),
                             lastmodified=formatDateTime(_layout.lastmodified),
                             created=formatDateTime(_layout.created),
                             layout_scope='shared',
                             #permission=_layout.permission,
                             )
                children.append(child)

        elif len(node.split('/')) == 3:
            root, parent, _node = node.split('/')
            if root == '' and parent in ['mylayout', 'sharedlayout'] and _node.split('/')[-1].startswith('layout_'):
                layout_id = _node[len('layout_'):]
                _layout = BiogpsGenereportLayout.objects.get(id=layout_id)
                #layout_data = json.loads(_layout.layout_data)
                for i, p in enumerate(_layout.layout_data):
                    p.update(getplugin(p['id']))
                    child = dict(text=p['title'],
                                 id='/'.join([root, parent, layout_id, 'plugin_' + str(i) + '_' + str(p['id'])]),
                                 leaf=True,
                                 cls="file",
                                 plugindata=p)
                    children.append(child)

#        if scope == 'my':
#            query_result = getall(request.adamuser)
#        else:
#            #shared
#            if request.adamuser.profile.has_key('sharedlayouts') and type(request.adamuser.profile['sharedlayouts']) is type([]):
#                query_result = BiogpsGenereportLayout.objects.filter(id__in=request.adamuser.profile['sharedlayouts'])
        return HttpResponse(json.dumps(children), mimetype='application/json')
    else:
        return HttpResponseBadRequest('Unsupported request method "%s"' % request.method)


def render_plugin_urls(request, layoutid):
    '''
    URL:  http://biogps.org/layout/159/renderurl/?gene=1017
    '''
    geneid = request.GET.get('geneid', '').strip()
    flag_mobile = request.GET.get('mobile', '').lower() not in ['0', 'false']    #TEMP. set flag_mobile default to True, so that iphone app can get
                                                        #mobile urls without adding "mobile" parameter.The default behavior
                                                        #may be changed later
    if not geneid:
        return HttpResponseBadRequest('Missing required parameter.')
    if not is_valid_geneid(geneid):
        return HttpResponseBadRequest('Invalid input parameters!')

    data = get_plugin_urls(request, layoutid, geneid, mobile=flag_mobile)
    if isinstance(data, HttpResponse):
        return data
    else:
        return JSONResponse(data)


def get_plugin_urls(request, layoutid, geneid, speciesid=None, mobile=False):
    '''
    Called by render_plugin_urls and mobile/getgeneurls
    URL:  http://biogps-dev.gnf.org/layout/159/renderurl/?geneid=1017
    '''

    if not geneid:
        return HttpResponseBadRequest('Missing required parameter.')
    if not is_valid_geneid(geneid):
        return HttpResponseBadRequest('Invalid input parameters!')

    available_layouts = get_my_layouts(request.user) | get_shared_layouts(request.user)

    try:
        layout = available_layouts.get(id=layoutid)
    except BiogpsGenereportLayout.DoesNotExist:
        return ExtError("Layout does not exist or not belong to you.")

    # ds = svc.DataService()
    # g = ds.getgene2(geneid)
    mg = MyGeneInfo()
    g = mg.get_geneidentifiers(geneid)


    if not g or len(g['SpeciesList']) == 0:
        return ExtError('Unknown gene id.')

    plugin_output = []
    for plugin in layout.plugins.order_by('title'):
        try:
            url = plugin.geturl(g, mobile=mobile)
            errmsg = None
        except PluginUrlRenderError, err:
            url = None
            errmsg = err.args[0]
        d = {'id': plugin.id,
              'title': plugin.title,
              'url': url}
        if errmsg:
            d['error'] = errmsg
        plugin_output.append(d)

    layout_output = []
    for lay in available_layouts.order_by('layout_name'):
        d = {'id': lay.id,
              'title': lay.layout_name}
        layout_output.append(d)

    data = {'success': True,
            'layout_id': layout.id,
            'layout_name': layout.layout_name,
            'geneid': geneid,
            'plugins': plugin_output,
            'layouts': layout_output}
    return data
