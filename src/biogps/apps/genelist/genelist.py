import time
import types
from functools import partial
from django.http import HttpResponse, HttpResponseBadRequest
from django.utils.encoding import smart_unicode
from django.utils.datastructures import MultiValueDictKeyError

from django_restapi.resource import Resource
from biogps.utils.helper import (ExtError, loginrequired, cvtPermission,
                                 formatDateTime, JSONResponse,
                                 setObjectPermission, json)
from biogps.utils import log
from biogps.apps.genelist.models import BiogpsGeneList
# from biogps.apps.boc import boc_svc as svc
from biogps.apps.boe.views import MyGeneInfo


class NameConflict(Exception):
    pass


def _genelist_name_exists(name, user):
    exist_genelists = user.mygenelists.filter(name=name)
    return exist_genelists.count() > 0


def _get_gene_info(geneid_li, request=None):
    '''return a geneinfo object ready to be loaded in genelist_panel
       based on input geneid_li.
    '''
    # ds = svc.DataService()
    # genedata = ds.querygenelist(geneid_li)
    mg = MyGeneInfo()
    genedata = mg.querygenelist(geneid_li)
    genedata = {'geneList': genedata}
    return genedata


class GeneListResource(Resource):
    '''
       REST API for ``BiogpsGeneList`` model

    '''
    __name__ = 'GeneListResource'

    def add_genelist(self, user, name, data, **kwargs):
        description = smart_unicode(kwargs.get('description', ''))
        options = json.loads(kwargs.get('options', 'null'))

        rolepermission = kwargs.get('rolepermission', None)
        userpermission = kwargs.get('userpermission', None)
        tags = kwargs.get('tags', None)

        if _genelist_name_exists(name, user):
            raise NameConflict

        genelist = BiogpsGeneList(name=name,
                                data=data,
                                size=len(data),
                                ownerprofile=user.get_profile(),
                                #author=user.get_full_name() or user.username,
                                description=description)
        if options:
            genelist.options = options
        genelist.save()
        if rolepermission or userpermission:
            setObjectPermission(genelist, rolepermission, userpermission, sep=',')

        if tags is not None:
            genelist.tags = smart_unicode(tags)

        return genelist

    @loginrequired
    def create(self, request, *args, **kwargs):
        #via POST
        try:
            name = smart_unicode(request.POST['name'])
            data = json.loads(request.POST['data'])
        except MultiValueDictKeyError:
            return ExtError("Missing required parameters")

        kwargs = dict([(k, request.POST[k]) for k in ['description', 'options', 'rolepermission', 'userpermission', 'tags']
                                                  if k in request.POST])
        try:
            genelist = self.add_genelist(request.user, name, data, **kwargs)
        except NameConflict:
            return ExtError('Gene set name was taken!')

        #logging genelist add
        log.info('username=%s clientip=%s action=genelist_add id=%s size=%s',
                    getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    genelist.id, genelist.size)

        data = {'success': True,
                'genelist_id': genelist.id}
        return JSONResponse(data)

    def get_genelist(self, query, user):
        '''Get genelist under the context of given user based on query, either genelist id or slug name.'''
        try:
            query = int(query)
        except ValueError:
            pass
        if type(query) is types.IntType:
            genelist = BiogpsGeneList.objects.get_available(user).get(id=query)
        else:
            genelist = BiogpsGeneList.objects.get_available(user).get(slug__iexact=query)
        return genelist

    def read(self, request, genelistid):
        #via GET
        try:
            genelist = self.get_genelist(genelistid, request.user)
            data = dict(name=genelist.name,
                        data=genelist.data,
                        size=genelist.size,
                        author=genelist.author,
                        description=genelist.description,
                        options=genelist.options,
                        permission=list(genelist.permission) if genelist.permission else None,
                        tags=genelist.tags if genelist.tags else None)

            if request.GET.get('geneinfo', False) and genelist.size > 0:
                genedata = _get_gene_info(genelist.data, request)
#                query = '\r\n'.join(genelist.data)
#                genedata = query_gene_by_anno(request, query, qtype='id',
#                                              resultperpage=10000, currentpage=1, searchtemplate=16,
#                                              format='json', returnpyobj=True)
                if isinstance(genedata, HttpResponse):
                    return genedata
                else:
                    data['data'] = genedata['geneList']

        except BiogpsGeneList.DoesNotExist:
            data = {'success': False,
                    'error': "GeneList does not exist."}

        return JSONResponse(data)

    @loginrequired
    def update(self, request, genelistid):
        #via PUT
        rolepermission = request.PUT.get('rolepermission', None)
        params = request.PUT
        updatable_fields = ['name', 'data', 'description']

        try:
            genelist = request.user.mygenelists.get(id=genelistid)
            for f in updatable_fields:
                if f in params:
                    if (f == 'name') and (params[f] != genelist.name) and (_genelist_name_exists(params[f], request.user)):
                        return ExtError('Name conflicts with existed one!')
                    if (f == 'data'):
                        try:
                            _data = json.loads(params[f])
                        except ValueError:
                            return ExtError('Passed "data" is not a valid json string.')
                        genelist.data = _data
                        genelist.size = len(_data)
                    else:
                        setattr(genelist, f, params[f])

#            #always update author column:
#            genelist.author = request.user.get_full_name() or request.user.username

            genelist.save()
            if rolepermission:
                setObjectPermission(genelist, rolepermission)
                data = {'success': True}
            else:
                data = {'success': True}

        except BiogpsGeneList.DoesNotExist:
            return ExtError("GeneList does not exist.")

        return JSONResponse(data)

    @loginrequired
    def delete(self, request, genelistid):
        #via DELETE
        try:
            genelist = request.user.mygenelists.get(id=genelistid)
            genelist.delete()
            #logging genelist delete
            log.info('username=%s clientip=%s action=genelist_delete id=%s',
                        getattr(request.user, 'username', ''),
                        request.META.get('REMOTE_ADDR', ''),
                        genelistid)

            data = {'success': True}
        except BiogpsGeneList.DoesNotExist:
            data = {'success': False,
                    'error': "GeneList does not exist."}

        return JSONResponse(data)


def get_my_genelists(user):
    if user.is_anonymous():
        return BiogpsGeneList.objects.get_empty_query_set()
    else:
        query_result = user.mygenelists.all()
        return query_result


def get_shared_genelists(user):
    query_result = BiogpsGeneList.objects.get_available(user, excludemine=True)
    return query_result


@loginrequired
def getmygenelists(request):
    '''
    >>> from django.test import Client
    >>> c=Client()
    >>> c.login(username='cwudemo', password='123')
    True
    >>> res = c.get('/getmygenelists/')
    >>> res.status_code
    200
    >>> res.content
    '[{"size": 14, "id": 1, "name": "test_set_1", "description": "test desc."}, {"size": 17, "id": 2, "name": "test_set_2", "description": "IPR008351"}]'
    >>> from django.utils import simplejson
    >>> type(simplejson.loads(res.content))
    <type 'list'>
    >>> c.logout()
    >>> res = c.get('/getmygenelists/')
    >>> res.status_code
    200
    >>> simplejson.loads(res.content)['success']
    False

    '''
    data = [dict(id=gs.id,
                 name=gs.name,
                 size=gs.size,
                 description=gs.description) for gs in request.user.mygenelists.all().order_by('name')]
    return JSONResponse(data)


@loginrequired
def genelist_operation(request, mode):
    '''
    Taking the %(mode)s of multiple genelists and save as a new genelist.
       /genelist/%(mode)s/
       POST
       genelistid=1&genelistid=2
       at most 100 genelists to be operated at once.
       if "validate=1" passed, return {'success':True, 'size': <size>} only without saving as a new genelist.
       if "saveasnew=1" passed, save the resulting gene as a new genelist and return {'success': True, 'genelist_id': new_gs.id}
       otherwise, return {'success': True, 'size': <size>, genes: <geneid_list>}
              if "geneinfo=1" passed, load detailed gene info by a SL query
    '''
    if mode not in ['union', 'intersection']:
        raise ValueError("Unknown mode parameter: " + mode)

    validate_only = request.POST.get('validate', '') == '1'
    saveasnew = request.POST.get('saveasnew', '') == '1'
    geneinfo = request.POST.get('geneinfo', '') == '1'

    genelist_li = request.POST.getlist('genelistid')
    if len(genelist_li) < 2:
        return ExtError("Select at least two genelists for operation.")
    elif len(genelist_li) > 100:
        return ExtError("At most 100 genelists can be operated at once.")

    if mode == 'union':
        _data = set()
        for ds in request.user.mygenelists.filter(id__in=genelist_li):
            _data |= set(ds.data)

    elif mode == 'intersection':
        _data = None
        for ds in request.user.mygenelists.filter(id__in=genelist_li):
            if _data is None:
                _data = set(ds.data)   # assign as the first set
            else:
                _data &= set(ds.data)

    if len(_data) == 0:
        return ExtError('No gene left after "%s" operation.' % mode)
    elif validate_only:
        return JSONResponse({'success': True, 'size': len(_data)})

    _data = sorted(_data)
    if not saveasnew:
        if not geneinfo:
            data = {'success': True, 'size': len(_data), 'genes': _data}
        else:
            genedata = _get_gene_info(_data, request)
            if isinstance(genedata, HttpResponse):
                return genedata
            else:
                data = {'success': True, 'size': len(_data), 'genes': genedata['geneList']}
    else:
        #Now save as a new genelist
        name = request.POST.get('name', "%s_GeneList_%s" % (mode.capitalize(), time.strftime('%m%d%Y')))
        description = request.POST.get('description', 'This genelist is created by taking %s from (%s)' % (mode, ', '.join(genelist_li)))
        gs_rsc = GeneListResource()
        try:
            new_gs = gs_rsc.add_genelist(request.user, name, _data, description=description)
        except NameConflict:
            return ExtError('Gene set name was taken!')

        #logging genelist <operation>
        log.info('username=%s clientip=%s action=genelist_%s id=%s size=%s',
                    getattr(request.user, 'username', ''),
                    request.META.get('REMOTE_ADDR', ''),
                    mode, new_gs.id, new_gs.size)

        data = {'success': True,
                'genelist_id': new_gs.id}

    return JSONResponse(data)

genelist_union = partial(genelist_operation, mode='union')
genelist_union.__module__ = genelist_operation.__module__     # required for docutils
genelist_union.__name__ = 'genelist_union'       # required for docutils
genelist_union.__doc__ = genelist_operation.__doc__ % {'mode': 'union'}

genelist_intersection = partial(genelist_operation, mode='intersection')
genelist_intersection.__module__ = genelist_operation.__module__      # required for docutils
genelist_intersection.__name__ = 'genelist_intersection'       # required for docutils
genelist_intersection.__doc__ = genelist_operation.__doc__ % {'mode': 'intersection'}


@loginrequired
def genelist_tree(request):
    """This is a service for populate genelist list in TreePanel.
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
            children = [dict(text='Saved Lists', id='/mygenelist', cls='folder'),
                        dict(text='Shared Lists', id='/sharedgenelist', cls='folder')]
        elif node.split('/') == ['', 'mygenelist']:
            #query_result = getall(request.adamuser)
            query_result = get_my_genelists(request.user)
            for _genelist in query_result:
                child = dict(text='%s (%s)' % (_genelist.name, _genelist.size),
                             id='/mygenelist/genelist_' + str(_genelist.id),
                             cls='folder',
                             genelist_id=_genelist.id,
                             genelist_name=_genelist.name,
                             author=_genelist.owner.get_valid_name(),
                             description=_genelist.description,
                             rolepermission=cvtPermission(_genelist.permission).get('R', None),
                             lastmodified=formatDateTime(_genelist.lastmodified),
                             created=formatDateTime(_genelist.created),
                             genelist_scope='my',
                             )
                children.append(child)
        elif node.split('/') == ['', 'sharedgenelist']:
            query_result = get_shared_genelists(request.user)
            for _genelist in query_result:
                child = dict(text='%s (%s)' % (_genelist.name, _genelist.size),
                             id='/sharedgenelist/genelist_' + str(_genelist.id),
                             cls='folder',
                             genelist_id=_genelist.id,
                             genelist_name=_genelist.layout_name,
                             author=_genelist.owner.get_valid_name(),
                             description=_genelist.description,
                             rolepermission=cvtPermission(_genelist.permission).get('R', None),
                             lastmodified=formatDateTime(_genelist.lastmodified),
                             created=formatDateTime(_genelist.created),
                             genelist_scope='shared',
                             )
                children.append(child)

        elif len(node.split('/')) == 3:
            root, parent, _node = node.split('/')
            if root == '' and parent in ['mygenelist', 'sharedgenelist'] and _node.split('/')[-1].startswith('genelist_'):
                genelist_id = _node[len('genelist_'):]
                _genelist = BiogpsGeneList.objects.get(id=genelist_id)
                children = [dict(text=gid,
                                  id='/'.join([root, parent, genelist_id, 'gene_' + str(i) + '_' + gid]),
                                  leaf=True,
                                  cls='file') for i, gid in enumerate(_genelist.data)]
        return JSONResponse(children)
    else:
        return HttpResponseBadRequest('Unsupported request method "%s"' % request.method)


@loginrequired
def genelist_download(request, format='csv'):
    '''This service dump multiple genelists and save as a csv file for user to download.
       /genelist/download/
       GET
       genelistid=1&genelistid=2

       Currently, only "csv" format is supported.
    '''
    genelist_li = request.GET.getlist('genelistid')
    gene_li = []
    for gs in request.user.mygenelists.filter(id__in=genelist_li):
        gene_li.extend([(gid, gs.name) for gid in gs.data])

    if format == 'csv':
        output_filename = 'saved_genelists.csv'
        response = HttpResponse(mimetype='text/csv')
        response['Content-Disposition'] = 'attachment; filename=' + output_filename
        response.write('\r\n'.join(['%s,%s' % row for row in gene_li]))
        return response
    else:
        return HttpResponseBadRequest('Unsupported output format "%s"' % format)
