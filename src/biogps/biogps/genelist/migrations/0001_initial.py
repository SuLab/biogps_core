# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields
import biogps.utils.fields.jsonfield


class Migration(migrations.Migration):

    dependencies = [
        ('auth2', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BiogpsGeneList',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=100)),
                ('data', biogps.utils.fields.jsonfield.JSONField(editable=False, blank=True)),
                ('size', models.PositiveIntegerField()),
                ('author', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('options', biogps.utils.fields.jsonfield.JSONField(editable=False, blank=True)),
                ('lastmodified', models.DateTimeField(auto_now=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('slug', django_extensions.db.fields.AutoSlugField(populate_from=b'name', editable=False, blank=True)),
                ('ownerprofile', models.ForeignKey(to='auth2.UserProfile', db_column=b'authorid', to_field=b'sid')),
            ],
            options={
                'ordering': ('name',),
                'get_latest_by': 'lastmodified',
            },
            bases=(models.Model,),
        ),
    ]
