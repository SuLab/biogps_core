# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import biogps.utils.fields.jsonfield
import biogps.plugin.fields
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('auth2', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BiogpsPlugin',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(max_length=100)),
                ('url', models.CharField(max_length=500)),
                ('author', models.CharField(max_length=100)),
                ('type', models.CharField(max_length=20)),
                ('options', biogps.utils.fields.jsonfield.JSONField(editable=False, blank=True)),
                ('description', models.TextField(blank=True)),
                ('short_description', models.CharField(max_length=140, blank=True)),
                ('lastmodified', models.DateTimeField(auto_now=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('slug', django_extensions.db.fields.AutoSlugField(populate_from=b'title', editable=False, blank=True)),
                ('species', biogps.plugin.fields.SpeciesField(max_length=1000)),
                ('ownerprofile', models.ForeignKey(to='auth2.UserProfile', db_column=b'authorid', to_field=b'sid')),
            ],
            options={
                'ordering': ('title',),
                'get_latest_by': 'lastmodified',
                'permissions': (('can_share_plugin', 'Can share plugins with others.'),),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BiogpsPluginPopularity',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('score', models.FloatField()),
                ('rank', models.PositiveIntegerField(default=0)),
                ('users_count', models.PositiveIntegerField(default=0)),
                ('related_plugins', biogps.utils.fields.jsonfield.JSONField(default=b'[]', editable=False, blank=True)),
                ('plugin', models.OneToOneField(related_name='popularity', to='plugin.BiogpsPlugin')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
