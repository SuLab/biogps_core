#!/home/ubuntu/logpy/bin/python
# -*- coding: utf-8 -*-

from argparse import ArgumentParser
from pymongo import Connection
from pymongo.errors import InvalidDocument


def parse_logs():
    """MongoDB parser that re-formats documents inserted via rsyslog.
    Until rsyslog supports regex-based logging to MongoDB (possibly ver. 7)
    this script will be necessary to extract additional data from the msg
    string and into separate fields."""

    # Argument parser
    parser = ArgumentParser(description='Extract additional information\
     from strings stored in MongoDB docs (via rsyslog) for the provided database\
     and collection. Field name is the new field to check for.')
    parser.add_argument('--db', help='database name', required=True)
    parser.add_argument('--collection', help='collection name', required=True)
    parser.add_argument('--field', help='new field name', required=True)
    args = parser.parse_args()
    _db = args.db
    _collection = args.collection
    _field = args.field

    # Connect to MongoDB (assuming default host and port)
    conn = Connection()
    coll = conn[_db][_collection]
    print 'Total docs in collection: {}'.format(coll.count())

    # Get all docs missing field name; these need parsing
    parsed_docs = 0
    for i in coll.find({'{}'.format(_field): {'$exists': False}}):
        msg_parsed = dict()
        props = i['msg'].split(' ')
        for p in props:
            if p.find('=') != -1:
                _prop = p.split('=')
                prop_name, prop_val = _prop[0], _prop[1]
                if prop_name == 'num_terms':
                    prop_val = prop_val.strip(',')
                    try:
                        prop_val = int(prop_val)
                    except ValueError:
                        print 'Unknown ID: {}'.format(prop_val)
                        continue
                msg_parsed[prop_name] = prop_val
        i[_field] = msg_parsed
        try:
            coll.save(i)
            parsed_docs += 1
        except InvalidDocument:
            pass


if __name__ == '__main__':
    parse_logs()
