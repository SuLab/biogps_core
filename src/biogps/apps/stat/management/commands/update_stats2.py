from biogps.apps.dataset.models import BiogpsDataset
from biogps.apps.gene.models import Gene
from biogps.apps.layout.models import BiogpsGenereportLayout
from biogps.apps.stat.models import BiogpsStat
from biogps.utils.helper import is_int

from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from pymongo import Connection
from time import time


# Currently updating stats for datasets, genes, layouts
stat_types = {'dataset': {"model": BiogpsDataset,
                          "action": 'dataset_metadata'},
              'gene': {"model": Gene,
                       "action": 'gene_identifiers'},
              'layout': {"model": BiogpsGenereportLayout,
                         "action": 'layout_query'}}

# Time frames
now = datetime.utcnow()  # using utc time as the LOG SERVER logs UTC time.
time_frames = ['weekly', 'monthly', 'all_time']
one_mo = now - timedelta(days=30)
prev_wk = now - timedelta(weeks=1)


class Command(BaseCommand):
    args = '<db collection>'
    help = 'Get BioGPS log entries from MongoDB on central logging server, '\
           'update statistics stored in BiogpsStat accordingly.'

    def handle(self, *args, **options):
        # Confirm required log server is set up
        if not getattr(settings, 'LOG_SERVER', None):
            raise CommandError('A log server must be specified in settings '
                               'before using this command')
        else:
            start = time()
            # Connect to MongoDB
            db = args[0]
            collection = args[1]
            conn = Connection(settings.LOG_SERVER)
            coll = conn[db][collection]
            print '\nTotal docs in collection: {}'.format(coll.count())

            for stype in stat_types:
                for tframe in time_frames:
                    stats = get_stats(coll, stype, tframe, top=100)
                    save_stats(stype, tframe, stats)

            print 'Finished. [{:.2f}s]'.format(time() - start)


def get_stats(coll, stype, tframe, top=100, verbose=False):
    ''' coll is a collection in logging mongodb
        stype is any of keys in stat_types
        tframe is any of "all_time", "monthly", "weekly".

    sample query:
    query = [{'$match': {"msg_parsed.action": 'gene_identifiers'}},
             {'$group': {"_id": "$msg_parsed.id", "count": {"$sum": 1}}},
             {'$match': {"count": {'$gte': 100}}},
             {'$sort': {'count': -1}},
             {'$limit': 100}]
    '''
    query = [{'$match': {"msg_parsed.action": stat_types[stype]['action']}},
             {'$group': {"_id": "$msg_parsed.id", "count": {"$sum": 1}}},
             #{'$match': {"count": {'$gte': 100}}},
             {'$sort': {'count': -1}},
             {'$limit': top}]

    t0 = time()
    if tframe == 'monthly':
        query[0]['$match']["time"] = {'$gte': one_mo}
    elif tframe == 'weekly':
        query[0]['$match']["time"] = {'$gte': prev_wk}

    if verbose:
        print query

    print 'Quering {} stats for {} time-frame...'.format(stype, tframe),
    res = coll.aggregate(query)
    print 'Done. [{:.2f}s]'.format(time() - t0)
    #remove non-integer ids for Gene
    if stype == 'gene':
        res['result'] = [x for x in res['result'] if is_int(x['_id'])]
    return res


def save_stats(stype, tframe, stats):
    """save ranked stats to db"""
    print 'Saving {} {} ranks for {} time-frame...'.format(len(stats['result']),
                                                           stype, tframe),
    con_type = ContentType.objects.get_for_model(stat_types[stype]['model'])
    id_list = [val['_id'] for val in stats['result']]
    #remove existing ids not needed any more
    BiogpsStat.objects.filter(content_type=con_type, interval=tframe)  \
                      .exclude(object_id__in=id_list) \
                      .delete()

    rank = 0
    for val in stats['result']:
        rank += 1
        obj_id = val['_id']
        obj_total = val['count']
        obj, created = BiogpsStat.objects.get_or_create(
            content_type=con_type, object_id=obj_id,
            interval=tframe, defaults={'count': obj_total,
                                       'rank': rank})

        if not created:
            #update existing object
            obj.count = obj_total
            obj.rank = rank
            obj.save()

    print "Done."
