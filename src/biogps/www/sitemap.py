from django.contrib.sitemaps import Sitemap
from biogps.www.models import BiogpsRootnode
import datetime

class GenereportSitemap(Sitemap):
    changefreq = "monthly"  #"never"
    priority = 0.9
    lastmod = datetime.date(2010,04,14)

    def items(self):
        return BiogpsRootnode.objects.all()

    def location(self, obj):
        return obj.get_absolute_url()

    def priority(self, obj):
        #lower priority for ensembl only gene since most of
        #them don't have much content
        return 0.9 if obj.data_source == 'ncbi' else 0.6

#     def lastmod(self, obj):
#         return obj.pub_date

class FlatPageSitemap(Sitemap):
    changefreq = "never"
    priority = 0.5
    lastmod = datetime.date(2009,1,1)

    def items(self):
        return ['about', 'terms', 'help']

    def location(self, obj):
        return '/' + obj + '/'
