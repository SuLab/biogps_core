from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic


class BiogpsStat(models.Model):
    content_type = models.ForeignKey(ContentType)
    object_id = models.PositiveIntegerField()
    content_object = generic.GenericForeignKey()
    interval = models.CharField(blank=False, max_length=100)
    count = models.IntegerField()
    rank = models.IntegerField()

    def __unicode__(self):
        return u'Stat for {} ID {}: interval: {}, count: {}, rank: '\
            '{}'.format(self.content_type, self.object_id, self.interval,
            self.count, self.rank)
