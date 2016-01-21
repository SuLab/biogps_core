#!/usr/bin/python
# -*- coding: utf-8 -*-
import subprocess

from django.utils import timezone

from boto.s3.connection import S3Connection
from boto.s3.key import Key
from os import remove


def backup_db():
    """Dump all BioGPS Postgres tables and their definitions,
       excluding datasets. Send to AWS S3."""

    now = timezone.now().date()
    backup_file = 'BioGPSP_no_DS_{}-{}-{}.dmp.gz'.format(now.year, now.month,
                  now.day)

    # Dump database tables, compress
    subprocess.check_call('/usr/local/pgsql/bin/pg_dump --exclude-table='
                          'dataset_* BioGPSP | gzip > {}'.format(backup_file),
                          shell=True, stderr=subprocess.STDOUT)

    # Send dump file to S3
    conn = S3Connection('<AWS_KEY_ID>', '<AWS_SECRET_KEY>')
    bucket = conn.get_bucket('biogps')
    k = Key(bucket)
    k.key = 'postgresp_backups/{}'.format(backup_file)
    k.set_contents_from_filename(backup_file)

    # Done, delete local file
    remove(backup_file)


if __name__ == '__main__':
    backup_db()
