from django.shortcuts import render
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import User
from biogps.utils.helper import JSONResponse
from biogps.plugin.models import BiogpsPlugin
from biogps.layout.models import BiogpsGenereportLayout

# Create your views here.

def index_stats(request, cached=True):
    index_stats_cache = 'index_stats_items'
    index_stats_items = cache.get(index_stats_cache) if cached else None
    if not index_stats_items:
        # Section to populate the index stats items
        index_stats_items = []
        new_users = User.objects.filter(date_joined__gte=timezone.now() - timezone.timedelta(weeks=1)).count()
        if new_users == 1:
            index_stats_items.append({"title": "Statistics", "body": "1 new user in the last week"})
        elif new_users > 1:
            index_stats_items.append({"title": "Statistics", "body": "{} new users in the last week".format(new_users)})
        index_stats_items.append({"title": "Statistics", "body": "{} registered plugins".format(BiogpsPlugin.objects.count())})
        index_stats_items.append({"title": "Statistics", "body": "{} custom layouts".format(BiogpsGenereportLayout.objects.count())})
        cache.set(index_stats_cache, index_stats_items, settings.CACHE_DAY)
    return JSONResponse(index_stats_items)
