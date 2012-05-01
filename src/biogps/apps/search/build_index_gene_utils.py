import types
import copy
import time

from biogps.utils import list2dict, json
from biogps.utils.models import Species


def get_db(dburl, dbname, verbose=True):
    import couchdb
    server = couchdb.Server(dburl)
    db = server[dbname]
    if verbose:
        print 'Connected to db at "%s".' % db.resource.url
    return db


def timesofar(t0, clock=0):
    '''return the string(eg.'3m3.42s') for the passed real time/CPU time so far
       from given t0 (return from t0=time.time() for real time/
       t0=time.clock() for CPU time).'''
    if clock:
        t = time.clock() - t0
    else:
        t = time.time() - t0
    h = int(t / 3600)
    m = int((t % 3600) / 60)
    s = round((t % 3600) % 60, 2)
    t_str = ''
    if h != 0:
        t_str += '%sh' % h
    if m != 0:
        t_str += '%sm' % m
    t_str += '%ss' % s
    return t_str


def doc_feeder(db, step=1000, s=None, e=None, inbatch=False):

    n = len(db)
    s = s or 1
    e = e or n
    print 'Found %d documents in database "%s".' % (n, db.name)
    for i in range(s-1, e+1, step):
        print "Processing %d-%d documents..." % (i+1, i+step),
        t0 = time.time()
        v_res = db.view('_all_docs', limit=step, skip=i, include_docs=True)
        if inbatch:
            yield v_res.rows
        else:
            for row in v_res:
                yield row.doc
        print 'Done.[%s]' % timesofar(t0)


def map_fn(_doc, return_mode=0, fulltext=False):

    key_list = []

    class dotdict(dict):
        def __getattr__(self, attr):
            value = self.get(attr, None)
            if type(value) is types.DictType:
                return dotdict(value)
            else:
                return value
    doc = dotdict(_doc)

    def alwayslist(value):
        if value is None:
            return []
        if type(value) in (types.ListType, types.TupleType):
            return value
        else:
            return [value]

    def value_apply(value, fn):
        if type(value) in (types.ListType, types.TupleType):
            return [fn(v) for v in value]
        else:
            return fn(value)

    def add_key(value, name, keyfn=None):
        key_list.extend([(str(keyfn(v) if keyfn else v).lower(), name)
                             for v in alwayslist(value)])

    ff_id = lambda d: str(d['id'])
    trim_ver = lambda s: s.split('.')[0]

    # ncbi gene id
    try:
        key_list.append((str(int(_doc.id)), 'entrezgene'))
    except ValueError:
        pass

    # ensembl
    for _e in alwayslist(doc.ensembl):
        _e = dotdict(_e)
        add_key(_e.gene, 'ensemblgene')
        add_key(_e.transcript, 'ensembltranscript')
        add_key(_e.protein, 'ensemblprotein')

    # homologene
    add_key(doc.homologene, 'homologene', ff_id)

    # interpro
    add_key(doc.interpro, 'interpro', ff_id)

    # uniprot
    if doc.uniprot:
        add_key(doc.uniprot.get('Swiss-Prot', None), 'uniprot')
        add_key(doc.uniprot.get('TrEMBL', None), 'uniprot')

    # go
    go = doc.go
    if go:
        add_key(go.BP, 'go', ff_id)
        add_key(go.CC, 'go', ff_id)
        add_key(go.MF, 'go', ff_id)

    # accession
    def add_acc(acc, name):
        if acc:
            add_key(acc.rna, name, trim_ver)
            add_key(acc.protein, name, trim_ver)

    add_acc(doc.accession, 'accession')

    # refseq
    add_acc(doc.refseq, 'refseq')

    # reporter
    def add_reporter(reporter, name):
        if reporter:
            for attr in reporter:
                add_key(reporter[attr], name)
    add_reporter(doc.reporter, 'reporter')

    # reagent
    def add_reagent(reagent, name):
        if reagent:
            for attr in reagent:
                add_key(reagent[attr], name, ff_id)
    add_reagent(doc.reagent, 'reagent')

    # Now handles all the rest of easy cases:
    attr_list = ["symbol", "alias", "unigene", "ipi", "prosite", "pdb",
                 'retired', 'pharmgkb',
                 "FLYBASE", "HGNC", "HPRD", "MGI", "MIM", "RATMAP", "RGD",
                 "TAIR", "WormBase", "ZFIN", "Xenbase"]
    for attr in attr_list:
        add_key(doc.get(attr, None), attr)

    if fulltext:
        #add the rest of fields need to be full-text indexed.
        for attr in ['name', 'summary', 'taxid']:
            add_key(doc.get(attr, None), attr)
        #add species
        add_key(Species[doc['taxid']].name, 'species')

        #add genomic_pos
        for genomic_pos in alwayslist(doc.genomic_pos):
            if 'chr' in genomic_pos and \
               'start' in genomic_pos and \
               'end' in genomic_pos:
                key_list.extend([(genomic_pos['chr'], 'chr'),
                                 (genomic_pos['start'], 'pos'),
                                 (genomic_pos['end'], 'pos')])
        #add genome assembly
        assembly = Species[doc['taxid']].assembly
        add_key(assembly, 'assembly')


    if return_mode in [1, 2]:
        _g = dict(symbol=doc.symbol,
                  taxid=doc.taxid)
        if doc.name:
            _g['name'] = doc.name
        if doc.homologene:
            _g['homologene'] = doc.homologene

        if return_mode == 1:
            key_set = set()
            for key, name in key_list:
                if key not in key_set:
                    _g['type'] = name
                    yield key, _g
                    del _g['type']
                    key_set.add(key)

        else:
            for key, name in set(key_list):
                yield [key, name], _g

    elif return_mode == 3:
        key_set = set()
        for key, name in key_list:
            if key not in key_set:
                yield key, name
                key_set.add(key)
    elif return_mode == 4:
        for key, name in set(key_list):
            yield [key, name], None
    else:
        for key, name in set(key_list):
            yield [key, name]


def make_field_mapping(db):
    int_fields = ['taxid']
    long_fields = ['pos']
    #stored_fields = ['symbol', 'name', 'id', 'taxid', 'homologene']
    text_fields = ['summary', 'name']
    storeonly_fields = ['homologene']
    single_value_fields = ['symbol', 'id', 'homologene', 'homologene_id']
       #All non-string fields are single value automatically.

    meta = db.get_attachment('_design/boc', 'meta/metadata.json').read()
#    meta = json.decode(meta)
    meta = json.loads(meta)
    id_fields = [f.lower() for f in meta['SEARCHABLE_FIELDS']]
    field_li = copy.copy(id_fields)
    #extra fields not listed in SEARCHABLE_FIELDS
    field_li.extend(['id', 'taxid', 'chr', 'pos', 'name', 'species', 'assembly',
                     'summary', 'homologene_id', 'in'])

    mapping = {}
    for f in field_li:
        d = {'store': "yes",
             'index': 'not_analyzed',
             'type': 'string',
             'term_vector': 'with_positions_offsets'}
        hl_d = {'store': "yes",
                'index': 'analyzed',
                'type': 'string',
                'term_vector': 'with_positions_offsets',
                'include_in_all': False}
        #Type species settings
        if f in int_fields:
            d['type'] = u"integer"
        elif f in long_fields:
            d['type'] = u"long"
        elif f in text_fields:
            d['index'] = "analyzed"

        if f in storeonly_fields:
            d['index'] = "no"
            del d['term_vector']

        if f == 'reporter':
            d.update({'term_vector': 'with_positions_offsets'})

        if f == 'name':
            d = {
             "type" : "multi_field",
             "store": "yes",
             "fields" : {
                "name" : {
                          'index': 'analyzed',
                          'type': 'string',
                          'boost': 2.0,
                          'term_vector': 'with_positions_offsets'
                         },
                "for_sort" : {
                              "type" : "string",
                              "index" : "not_analyzed"
                             }
              }
        }

        if f == 'go':
            pass

        mapping[f] = d

##        set up highlight fields
#        if f not in storeonly_fields:
#            mapping['hl_'+f] = hl_d
#            hl_fields.append('hl_'+f)

#    mapping['hl_all'] = hl_d
#    hl_fields.append('hl_all')

    #setting boost
    for f in mapping.keys():
        if f in id_fields:
            mapping[f]['boost'] = 3
    mapping['symbol']['boost'] = 10
#    mapping['name']['boost'] = 2
    mapping['summary']['boost'] =1.5

    return mapping


def genedoc_cvt(doc):
    _doc = map_fn(doc, fulltext=True)
    out = list2dict([(b.lower(), a) for (a, b) in _doc], 0)
    out['in'] = 'gene'
    out['id'] = doc.id
    if 'homologene' in doc:
        if 'homologene' in out:
            out['homologene_id'] = out['homologene']
#        out['homologene'] = json.encode(doc['homologene'])
        out['homologene'] = json.dumps(doc['homologene'])
    return out

def genedoc_cvt2(doc, db):
#    _doc = map_fn(doc, fulltext=True)
    status, request, out = db.resource('_design', 'boc', '_show','convert',doc.id).get_json(with_fulltext=1, with_interval=1)
    assert status==200
    out['in'] = 'gene'
    _key_li = []
    for k in out:
        if k.lower() != k:
            _key_li.append(k)
    for k in _key_li:
        out[k.lower()] = out[k]
        del out[k]
    if 'homologene' in doc:
        if 'homologene' in out:
            out['homologene_id'] = out['homologene']
#        out['homologene'] = json.encode(doc['homologene'])
        out['homologene'] = json.dumps(doc['homologene'])
    return out



