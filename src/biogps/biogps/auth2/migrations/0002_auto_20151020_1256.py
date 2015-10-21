# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('auth2', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usermigration',
            name='migrated',
            field=models.BooleanField(default=False),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='usermigration',
            name='to_delete',
            field=models.NullBooleanField(),
            preserve_default=True,
        ),
    ]
