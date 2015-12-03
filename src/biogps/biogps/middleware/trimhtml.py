import re
from django.utils.encoding import force_unicode
from django.conf import settings
 
class SpacelessMiddleware(object):
    def process_response(self, request, response):
        if not settings.DEBUG and 'text/html' in response['Content-Type']:
            response.content = re.sub(r'>\s+<', '> <', force_unicode(response.content))
        return response
