# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import biogps.utils.fields.jsonfield


class Migration(migrations.Migration):

    dependencies = [
        ('plugin', '0001_initial'),
        ('auth2', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BiogpsGenereportLayout',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('layout_name', models.CharField(max_length=100)),
                ('author', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('lastmodified', models.DateTimeField(auto_now=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('ownerprofile', models.ForeignKey(to='auth2.UserProfile', db_column=b'authorid', to_field=b'sid')),
            ],
            options={
                'ordering': ('layout_name',),
                'get_latest_by': 'lastmodified',
                'permissions': (('can_share_layout', 'Can share layouts with others.'),),
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BiogpsLayoutPlugin',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('height', models.PositiveIntegerField(null=True, blank=True)),
                ('width', models.PositiveIntegerField(null=True, blank=True)),
                ('left', models.PositiveIntegerField(null=True, blank=True)),
                ('top', models.PositiveIntegerField(null=True, blank=True)),
                ('useroptions', biogps.utils.fields.jsonfield.JSONField(editable=False, blank=True)),
                ('layout', models.ForeignKey(to='layout.BiogpsGenereportLayout')),
                ('plugin', models.ForeignKey(to='plugin.BiogpsPlugin')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='biogpsgenereportlayout',
            name='plugins',
            field=models.ManyToManyField(to='plugin.BiogpsPlugin', through='layout.BiogpsLayoutPlugin'),
            preserve_default=True,
        ),
    ]
