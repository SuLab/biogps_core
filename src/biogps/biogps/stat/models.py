from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class BiogpsStatManager(models.Manager):
    """Custom stat app manager"""
    def sort_model(self, mdl, intvl, ordr_attr, max_res):
        """Return list of results for given model (mdl), time interval (intvl),
           ordered by ordr_attr, limited to max_res number of results."""
        model_ids = self.model.objects.filter(content_type=
            ContentType.objects.get_for_model(mdl), interval=intvl).order_by(
            ordr_attr).filter(rank__lte=max_res).values_list('object_id',
            flat=True)
        results_list = []
        for i in model_ids:
            try:
                _instance = mdl.objects.get(id=i)
                if _instance:
                    results_list.append(_instance)
            except AttributeError:
                pass
        return results_list


class BiogpsStat(models.Model):
    content_type = models.ForeignKey(ContentType)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey()
    interval = models.CharField(blank=False, max_length=100)
    count = models.IntegerField()
    rank = models.IntegerField()

    # Custom manager
    objects = BiogpsStatManager()

    def __unicode__(self):
        return u'Stat for {} ID {}: interval: {}, count: {}, rank: '\
            '{}'.format(self.content_type, self.object_id, self.interval,
            self.count, self.rank)
