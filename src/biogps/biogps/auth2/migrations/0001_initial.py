# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
import biogps.utils.fields.jsonfield


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserFlag',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.CharField(max_length=1, choices=[(b'D', b'Demo account')])),
                ('user', models.OneToOneField(related_name='flag', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='UserMigration',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('migrated', models.BooleanField()),
                ('to_delete', models.BooleanField()),
                ('flag', models.CharField(max_length=100, blank=True)),
                ('user', models.OneToOneField(related_name='migration', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('sid', models.CharField(db_index=True, unique=True, max_length=100, blank=True)),
                ('affiliation', models.CharField(max_length=100, blank=True)),
                ('roles', models.CharField(max_length=200, blank=True)),
                ('uiprofile', biogps.utils.fields.jsonfield.JSONField(blank=True)),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, unique=True)),
            ],
            options={
                'ordering': ('user__username',),
            },
            bases=(models.Model,),
        ),
    ]
