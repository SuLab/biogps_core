#!/home/ubuntu/logpy/bin/python
# -*- coding: utf-8 -*-
import subprocess

from django.utils import timezone

from boto.s3.connection import S3Connection
from boto.s3.key import Key
from os import chdir, remove


def backup_logs():
    """Dump all BioGPS logs from MongoDB, send to AWS S3."""

    now = timezone.now().date()
    backup_datename = 'BioGPSP_logs_{}-{}-{}'.format(now.year, now.month,
        now.day)

    # Dump logs from database
    dump_cmd = '/usr/bin/mongodump --db logs --collection biogps_prod'
    subprocess.check_call(dump_cmd, shell=True, stderr=subprocess.STDOUT)

    # Rename files, compress data
    chdir('dump/logs')
    data_file = backup_datename + '.bson'
    meta_file = backup_datename + '.metadata.json'
    tar_file = backup_datename + '.tar'
    mv_gzip_cmd = 'mv biogps_prod.bson {0}; mv biogps_prod.metadata.json {1};'\
        ' tar -cf {2} {0} {1}; gzip {2}'.format(data_file, meta_file, tar_file)
    subprocess.check_call(mv_gzip_cmd, shell=True, stderr=subprocess.STDOUT)

    # Send dump files to S3
    conn = S3Connection('<AWS_KEY_ID>', '<AWS_SECRET_KEY>')
    bucket = conn.get_bucket('biogps')
    k = Key(bucket)
    tar_gz = tar_file + '.gz'
    k.key = 'mongodb_log_backups/{}'.format(tar_gz)
    k.set_contents_from_filename(tar_gz)

    # Done, delete local files
    remove(meta_file)
    remove(data_file)
    remove(tar_gz)


if __name__ == '__main__':
    backup_logs()
