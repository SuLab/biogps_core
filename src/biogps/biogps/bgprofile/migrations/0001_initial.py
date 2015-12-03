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
            name='BiogpsProfile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('info', biogps.utils.fields.jsonfield.JSONField(default=[{b'body': b"I use BioGPS, but haven't written anything about myself yet.", b'name': b'About Me'}], blank=True)),
                ('links', biogps.utils.fields.jsonfield.JSONField(default=[], blank=True)),
                ('privacy', biogps.utils.fields.jsonfield.JSONField(default={b'email_visible': b'private', b'name_visible': b'friends', b'profile_visible': b'friends'}, blank=True)),
                ('user', models.OneToOneField(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
