#!/home/ubuntu/logpy/bin/python
# -*- coding: utf-8 -*-

from datetime import date
from boto.s3.connection import S3Connection
from boto.s3.key import Key
from os import chdir, remove
import subprocess


def backup_logs():
    """Dump all BioGPS logs from MongoDB, send to AWS S3."""

    now = date.today()
    backup_datename = 'BioGPSP_logs_{}-{}-{}'.format(now.year, now.month,
        now.day)

    # Dump logs from database
    dump_cmd = '/usr/bin/mongodump --db logs --collection biogps_prod'
    subprocess.check_call(dump_cmd, shell=True, stderr=subprocess.STDOUT)

    # Rename files, compress data
    chdir('dump/logs')
    data_file = backup_datename + '.bson'
    meta_file = backup_datename + '.metadata.json'
    mv_gzip_cmd = 'mv biogps_prod.bson {}; gzip {};'\
        ' mv biogps_prod.metadata.json {}'.format(data_file, data_file,
        meta_file)
    subprocess.check_call(mv_gzip_cmd, shell=True, stderr=subprocess.STDOUT)

    # Send dump files to S3
    data_gz = data_file + '.gz'
    conn = S3Connection('<AWS_KEY_ID>', '<AWS_SECRET_KEY>')
    bucket = conn.get_bucket('biogps')
    k = Key(bucket)
    k.key = 'mongodb_log_backups/{}'.format(data_gz)
    k.set_contents_from_filename(data_gz)

    k.key = 'mongodb_log_backups/{}'.format(meta_file)
    k.set_contents_from_filename(meta_file)

    # Done, delete local files
    remove(data_gz)
    remove(meta_file)


if __name__ == '__main__':
    backup_logs()
