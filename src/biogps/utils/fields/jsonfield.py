import datetime
from django import forms
from django.db import models, connection
from django.db.models import signals
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import simplejson as json


class JSONWidget(forms.Textarea):
    def render(self, name, value, attrs=None):
        if not isinstance(value, basestring):
            value = json.dumps(value, indent=2)
        return super(JSONWidget, self).render(name, value, attrs)



class JSONFormField(forms.CharField):
    def __init__(self, *args, **kwargs):
        kwargs['widget'] = JSONWidget
        super(JSONFormField, self).__init__(*args, **kwargs)

    def clean(self, value):
        if not value: return
        try:
            return json.loads(value)
        except Exception, exc:
            raise forms.ValidationError(u'JSON decode error: %s' % (unicode(exc),))


class JSONField(models.TextField):
    '''JSONField is a generic textfield that neatly serializes/unserializes
    JSON objects seamlessly.
    http://github.com/bradjasper/django-jsonfield/tree/master'''

    # Used so to_python() is called
    __metaclass__ = models.SubfieldBase

    def formfield(self, **kwargs):
        return super(JSONField, self).formfield(form_class=JSONFormField, **kwargs)

    def to_python(self, value):
        '''Convert our string value to JSON after we load it from the DB'''
        if value == "":
            return None
        try:
            if isinstance(value, basestring):
                return json.loads(value)
        except ValueError:
            pass
        return value

    def get_db_prep_value(self, value):
        '''Convert our JSON object to a string before we save'''
        if value == "":
            return None
        if isinstance(value, dict) or isinstance(value, list):
            value = json.dumps(value, cls=DjangoJSONEncoder)
        return super(JSONField, self).get_db_prep_value(value)

    def value_to_string(self, model_instance):
        '''Returns a string value of this field from the passed model_instance.
           This is used by the serialization framework.
        '''
        value = getattr(model_instance, self.attname, None)
        js_value = json.dumps(value)
        if js_value == 'null':
            js_value = None
        return js_value

    def get_default(self):
        '''Returns the default value for this field'''
        if self.has_default():
            if callable(self.default):
                return self.default()
            return self.default
        if not self.empty_strings_allowed or (self.null and not connection.features.interprets_empty_strings_as_nulls):
            return None
        return ""

from south.modelsinspector import add_introspection_rules
add_introspection_rules([], ["^biogps\.utils\.fields\.jsonfield\.JSONField"])
