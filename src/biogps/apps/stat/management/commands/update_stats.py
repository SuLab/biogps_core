# -*- coding: utf-8 -*-

from biogps.apps.dataset.models import BiogpsDataset
from biogps.apps.gene.models import Gene
from biogps.apps.layout.models import BiogpsGenereportLayout
from biogps.apps.stat.models import BiogpsStat
from datetime import datetime
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.core.management.base import BaseCommand, CommandError
from django.db.utils import IntegrityError
from pymongo import Connection
from time import time


# Currently updating stats for datasets, genes, and layouts
stat_types = {BiogpsDataset: ['dataset_metadata'],
    Gene: ['gene_identifiers'],
    BiogpsGenereportLayout: ['layout_query']}

# Stat results
stats = dict()  # {BiogpsDataset: {'1': {'monthly': 100}}}
for t in stat_types.keys():
    stats[t] = {}

# Time frames/intervals
t_intervals = ['weekly', 'monthly', 'all_time']
now = datetime.now()
one_mo = now - relativedelta(months=1)
prev_wk = now - relativedelta(weeks=1)


def rank_stats(sts, time_frame):
    """Rank stats array of dicts by time frame"""
    sts.sort(key=lambda x: x[time_frame], reverse=True)


def save_ranks(st_type, rnks, intrvl):
    """Iterate over ranked list of stats, save to db"""
    for idx, val in enumerate(rnks):
        #print idx, val
        try:
            con_type = ContentType.objects.get_for_model(st_type)
            obj, created = BiogpsStat.objects.get_or_create(
                content_type=con_type, object_id=val['id'],
                interval=intrvl, defaults={'count': val[intrvl],
                'rank': idx + 1})
        except IntegrityError:
            print 'IntegrityError: {} {} {} {}'.format(con_type,
                val['id'], intrvl, val[intrvl])
            return
        except ValueError:
            print 'ValueError: {} {} {} {}'.format(con_type, val['id'],
                intrvl, val[intrvl])
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
    if stat_id[:3].upper() not in ['GDS', 'GSE']:
        try:
            int(stat_id)
        except ValueError:
            print 'Can\'t convert {} to int!'.format(stat_id)
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
            _db = args[0]
            _collection = args[1]
            conn = Connection(settings.LOG_SERVER)
            coll = conn[_db][_collection]
            print '\nTotal docs in collection: {}'.format(coll.count())

            # Get/process stats from all docs
            parsed_count = 0
            parsed_docs = coll.find()
            for i in parsed_docs:
                try:
                    msg_parsed = i['msg_parsed']
                except KeyError:
                    continue

                # Only parse actions we've specifically logged
                if msg_parsed and 'action' in msg_parsed.keys():
                    parsed_count += 1

                    for s in stat_types.iteritems():
                        if msg_parsed['action'] in s[1]:
                            # Update stats
                            t_frame = stat_time_frame(i['time'])

                            _type = s[0]
                            _id = msg_parsed['id']

                            # Temporary clean-up of bad ds IDs
                            if _type == BiogpsDataset and _id.find('/') != -1:
                                _id = _id.split('/')[0]

                            # Tally statistic
                            update_stat(_type, _id, t_frame)

            # Rank all results, update BioGPS stats
            for st in stats.keys():
                ranks = list()
                for k, v in stats[st].iteritems():
                    v['id'] = k
                    ranks.append(v)
                for ti in t_intervals:
                    rank_stats(ranks, ti)
                    save_ranks(st, ranks, ti)

            print 'Successfully parsed {} docs'.format(parsed_count)
            print 'Took {} secs'.format(time() - start)
