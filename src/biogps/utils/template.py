"""
This is taken and modified from ragendja (snippet library) at
http://code.google.com/p/app-engine-patch/

The app_prefixed_loader is a template loader that loads directly from the app's
'templates' folder when you specify an app prefix ('app/template.html').
"""
from django.conf import settings
from django.template import TemplateDoesNotExist
from apputils import get_app_dirs
import os.path

# The following defines a template loader that loads templates from a specific
# app based on the prefix of the template path:
# get_template("app/template.html") => app/templates/template.html
# This keeps the code DRY and prevents name clashes.
def app_prefixed_loader(template_name, template_dirs=None):
    packed = template_name.split('/', 1)
    if len(packed) == 2 and packed[0] in app_template_dirs:
        path = os.path.join(app_template_dirs[packed[0]], packed[1])
        try:
            return (open(path).read().decode(settings.FILE_CHARSET), path)
        except IOError:
            pass
    raise TemplateDoesNotExist, template_name
app_prefixed_loader.is_usable = True

# This is needed by app_prefixed_loader.
app_template_dirs = get_app_dirs('templates')
