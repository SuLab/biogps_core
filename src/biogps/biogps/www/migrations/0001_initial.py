# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import biogps.utils.fields.jsonfield


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='BiogpsAltLayout',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('layout_name', models.CharField(max_length=100)),
                ('layout_number', models.CharField(max_length=50)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BiogpsInfobox',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.CharField(max_length=15, choices=[('statistic', 'statistic'), ('quote', 'quote'), ('featured', 'featured'), ('other', 'other')])),
                ('content', models.TextField()),
                ('detail', models.TextField(null=True, blank=True)),
                ('options', biogps.utils.fields.jsonfield.JSONField(null=True, editable=False, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BiogpsPermission',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('object_type', models.CharField(max_length=5, choices=[(b'P', b'Plugin'), (b'L', b'Layout'), (b'G', b'Genelist'), (b'D', b'Dataset')])),
                ('object_id', models.IntegerField()),
                ('permission_type', models.CharField(max_length=2, choices=[(b'R', b'Role'), (b'U', b'User'), (b'F', b'Friends')])),
                ('permission_value', models.CharField(max_length=100)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BiogpsRootnode',
            fields=[
                ('id', models.CharField(max_length=50, serialize=False, primary_key=True)),
                ('data_source', models.CharField(max_length=50)),
                ('data_source_rank', models.IntegerField()),
                ('root_node', models.IntegerField()),
                ('flag', models.IntegerField(blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BiogpsTip',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('html', models.TextField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
