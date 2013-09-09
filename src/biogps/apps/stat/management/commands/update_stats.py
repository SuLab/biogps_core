# -*- coding: utf-8 -*-
'''
This is Deprecated!
'''

from biogps.apps.dataset.models import BiogpsDataset
from biogps.apps.gene.models import Gene
from biogps.apps.layout.models import BiogpsGenereportLayout
from biogps.apps.stat.models import BiogpsStat
from biogps.utils.helper import is_valid_geneid

from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.core.management.base import BaseCommand, CommandError
from django.db.utils import IntegrityError
from django.utils.encoding import smart_unicode
from pymongo import Connection
from time import time


# Currently updating stats for datasets, genes, layouts
stat_types = {BiogpsDataset: ['dataset_metadata'],
              Gene: ['gene_identifiers'],
              BiogpsGenereportLayout: ['layout_query']}

# Stat results
stats = dict()  # {BiogpsDataset: {'1': {'monthly': 100}}}

# Time frames
now = datetime.now()
time_frames = ['weekly', 'monthly', 'all_time']
one_mo = now - timedelta(days=30)
prev_wk = now - timedelta(weeks=1)


def rank_by_time(sts, time_frame):
    """Rank stats array of dicts by time frame"""
    sts.sort(key=lambda x: x[time_frame], reverse=True)


def save_ranks(st_type, rnks, st_tframe):
    """Iterate over ranked list of stats, save to db"""
    prev_rank, prev_rank_val, rank = 0, 0, 0
    print '\nSaving {} {} ranks for {} time-frame...'.format(len(rnks),
        st_type.short_name, st_tframe)
    for idx, val in enumerate(rnks):
        obj_total = val[st_tframe]
        if obj_total != prev_rank_val:
            # New rank
            rank = idx + 1
            prev_rank = rank
            prev_rank_val = obj_total
        else:
            # Same total as previous, same rank
            rank = prev_rank
        try:
            obj_id = val['id']
            con_type = ContentType.objects.get_for_model(st_type)
            obj, created = BiogpsStat.objects.get_or_create(
                content_type=con_type, object_id=obj_id,
                interval=st_tframe, defaults={'count': obj_total,
                'rank': rank})
        except IntegrityError:
            print 'IntegrityError: {} {} {} {}'.format(con_type,
                obj_id, st_tframe, obj_total)
            return
        except ValueError:
            print 'ValueError: {} {} {} {}'.format(con_type, obj_id,
                st_tframe, obj_total)
            return


def stat_time_frame(st_time):
    """Determine which time frame stat is in. Older dates < newer dates"""
    if st_time < one_mo:
        tf = 'all_time'
    if st_time < prev_wk:
        tf = 'monthly'
    else:
        tf = 'weekly'
    return tf


def update_stat(stat_type, stat_id, stat_time_frame):
    """Update stat for object"""
    # Confirm stat is for valid object
    if stat_type == Gene:
        if not is_valid_geneid(stat_id):
            return
    else:
        #either BiogpsDataset or BiogpsGenereportLayout
        try:
            int(stat_id)
        except ValueError:
            try:
                print "Can't convert {} to int!".format(smart_unicode(stat_id))
            except UnicodeEncodeError:
                pass
            return
        try:
            stat_type.objects.get(id=stat_id)
        except AttributeError:
            print 'AttributeError: {} {}'.format(stat_type.short_name, stat_id)
            return
        except ObjectDoesNotExist:
            print '{} object #{} does not exist'.format(stat_type.short_name,
                stat_id)
            return

    # Update stat for given time frame
    all_time_stat = True if stat_type == 'all_time' else False
    if stat_id not in stats[stat_type]:
        stats[stat_type][stat_id] = {'all_time': 0, 'monthly': 0, 'weekly': 0}
    if not all_time_stat:
        stats[stat_type][stat_id][stat_time_frame] += 1
    stats[stat_type][stat_id]['all_time'] += 1


class Command(BaseCommand):
    args = '<db collection>'
    help = 'Get BioGPS log entries from MongoDB on central logging server, '\
           'update statistics accordingly.'
    # Disable debug mode to limit memory usage
    settings.DEBUG = False

    def handle(self, *args, **options):
        # Confirm required log server is set up
        if not settings.LOG_SERVER:
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

            # Get/process stats based on stat type, action
            for s in stat_types.iteritems():
                _type = s[0]
                stats[_type] = {}
                print _type.short_name
                t0 = time()
                for action in s[1]:
                    _docs = coll.find({'msg_parsed.action': action},
                                      timeout=False)

                    try:
                        for i in _docs:
                            # Stat time frame
                            t_frame = stat_time_frame(i['time'])
                            _id = i['msg_parsed']['id']
                            # Tally statistic
                            update_stat(_type, _id, t_frame)
                    finally:
                        #close cursor
                        _docs.close()
                print '\tupdating', time()-t0

                # Rank all results, update BioGPS stats
                ranks = list()
                for k, v in stats[_type].iteritems():
                    # Add stat object id to dict
                    v['id'] = k
                    ranks.append(v)
                for t in time_frames:
                    rank_by_time(ranks, t)
                    save_ranks(_type, ranks, t)

                print '\tsaving', time()-t0

                # Done with stat type, clear before reuse
                stats.clear()

            print 'Took {} secs'.format(time() - start)
