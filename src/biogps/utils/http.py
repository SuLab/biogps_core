'''
This module provides useful utilitis and shortcuts for anything HttpResponse,
HttpRequest related. They are often used in view functions/classes
'''
from django.conf import settings
from django.http import HttpResponse, HttpResponseNotAllowed
from django.template import RequestContext
from django.shortcuts import render_to_response as raw_render_to_response
from biogps.utils import json
from biogps.utils.const import MIMETYPE
from biogps.utils.model_serializer import serialize


def JSONResponse(pyobj, do_not_encode=False, **kwargs):
    '''Return a JSON serialized HttpRespone.
       if do_not_encode is True, assuming pyobj is already a JSON string, and
        just return it as it is.
    '''
    return HttpResponse(json.dumps(pyobj) if not do_not_encode else pyobj,
                        content_type='application/json; charset=%s' % settings.DEFAULT_CHARSET, **kwargs)


def TextResponse(string='', **kwargs):
    return HttpResponse(string,
                        content_type='text/plain; charset=%s' % settings.DEFAULT_CHARSET, **kwargs)


def XMLResponse(xmldata, **kwargs):
    return HttpResponse(xmldata,
                        content_type='text/xml; charset=%s' % settings.DEFAULT_CHARSET, **kwargs)


def json_error(errmsg, status=200, **extra):
    '''Return a standard Json-ized dictionary with given errmsg:
        @return: {'success': false,
                  'error': "there is an error here."}

        @param errmsg: actual error msg.
        @param status: given a different status code if needed.
        @param extra: anything passed in extra will be included in returned
                      dictionary.
                      E.g., json_error('error', redirect_to='/goto/here') will
                         returns {'success': false,
                                  'error':   'error',
                                  'redirect_to': '/goto/here'}

    '''
    error = {'success': False,
             'error': errmsg}
    return HttpResponse(json.dumps(error), mimetype=MIMETYPE['json'], status=status)


class UnSupportedFormat(Exception):
    '''Raise this if passed format is not in the SUPPORTED_FORMATS list.'''


class FormattedResponse():
    '''
    This is a helper class to return specific HttpResponse instance based on
    requested format. The typical usage is via L{render_to_formatted_response}
    shortcut function:

        def your_view(request):
            return render_to_formatted_response(request, data,
                                                allowed_formats=['json', 'xml'])

    '''
    SUPPORTED_FORMATS = ['html', 'json', 'xml']  # The order of this list
                                                 # defines the priority.

    def __init__(self, request,
                 data=None,
                 serialize_attrs=None,
                 model_serializer=None,
                 model_serializer_kwargs={},
                 html_template=None,
                 html_dictionary={},
                 html_skip_context=False,
                 allowed_formats=['html', 'json', 'xml'],
                 default_format='html'):
        '''
        @param request: HttpRequest instance
        @param data: any python object to be serialized.
                    if data is a list/tuple of B{Model instance} or a single B{Model instance},
                    "serialize_attrs" parameter can be used to specify the attributes in the output.
                    if data is other type, it is output as it is.
        @param serialize_attrs: list of attributes from B{Model instance} need to be serialized
                                (it can be a method with no extra arguments but self)
        @param model_serializer: can be used to pass a custom serializer:
                                    1. a method name of the passed B{Model instance}
                                    2. a standalone function with the B{Model instance} as the first argument
                                 Note that when model_serializer is passed, parameter "serialize_attrs" is ignored.
        @param model_serializer_kwargs: the extra keyword paramters can be passed when model_serializer
                                          is called.
        @param html_template:  template file to render html page, passed to render_to_response
        @param html_dictionary: dictionary passed to render_to_response
        @param html_skip_context: if False(default), a context_instance is always passed to render_to_response
        @param allowed_formats: a list of allowed formats
        @param default_format: the default format if format is not requested.
        '''
        self._request = request
        self._data = data
        self.serialize_attrs = serialize_attrs
        self.model_serializer = model_serializer
        self.model_serializer_kwargs = model_serializer_kwargs
        self.html_template = html_template
        self.html_dictionary = html_dictionary
        self.html_skip_context = html_skip_context

        if default_format not in self.SUPPORTED_FORMATS:
            raise UnSupportedFormat
        else:
            self.default_format = default_format

        for f in allowed_formats:
            if f not in self.SUPPORTED_FORMATS:
                raise UnSupportedFormat
        self.allowed_formats = allowed_formats

    def get_format(self, request):
        '''Get requested format based on:
             1. passed "format" URL parameter (via GET)
             2. passed "accept" header
        '''
        format = self._get_format_by_urlparam(request) or \
                 self._get_format_by_header(request) or \
                 self.default_format
        return format

    def _get_format_by_header(self, request):
        '''Get requested format based on passed "accept" header.
           Return None if none is matched.
        '''
        http_accept_header = request.META.get('HTTP_ACCEPT', '')
        # Special handling for IE's completely bizarre behavior
        if http_accept_header.find('application/xaml+xml') != -1:
            return self.SUPPORTED_FORMATS[0]

        format = None
        for fmt in self.SUPPORTED_FORMATS:
            if http_accept_header.find(fmt) != -1:
                format = fmt
                break
        return format

    def _get_format_by_urlparam(self, request):
        '''Get requested format based on passed "format" URL parameter.
           Return None if no such parameter or passed value is not supported.
        '''
        format = request.REQUEST.get('format', '').lower().strip()
        if format not in self.SUPPORTED_FORMATS:
            format = None
        return format

    def render(self):
        '''returns actual HttpReponse instance based on requested format.'''
        format = self.get_format(self._request)

        if format not in self.allowed_formats:
            return HttpResponseNotAllowed(self.allowed_formats)
        elif format in ['json', 'xml']:
            return HttpResponse(serialize(self._data,
                                          format=format,
                                          attrs=self.serialize_attrs,
                                          model_serializer=self.model_serializer,
                                          **self.model_serializer_kwargs),
                                mimetype=MIMETYPE.get(format, None))
        elif format == 'html':
            if self.html_skip_context:
                context = None
            else:
                if settings.DEBUG:
                    from django.core.context_processors import request as request_processor
                    context = RequestContext(self._request, {}, (request_processor,))
                else:
                    context = RequestContext(self._request)
#                #always add django_compress to the context
#                #the value is based on compress.conf.settings.COMPRESS
#                context['django_compress'] = getattr(settings, 'COMPRESS', not settings.DEBUG)

                # add get_vars for use in passing on search parameters to JSON and XML links
                # this logic is adapted from django-pagination
                getvars = context['request'].GET.copy()
                if len(getvars.keys()) > 0:
                    context['getvars'] = "&%s" % getvars.urlencode()
                else:
                    context['getvars'] = ''

#                # add the full path as a variable for use with the login/logout links
#                context['full_path'] = context['request'].path_info
#                if context['getvars']:
#                    context['full_path'] += '?' + context['getvars']

#                # set the maximum search query length
#                context['max_query_length'] = settings.ES_MAX_QUERY_LENGTH

                # set alternate formats based on what has been allowed
                if len(self.allowed_formats) > 1:
                    # remove the HTML format but keep the rest
                    context['alternate_formats'] = [af for af in self.allowed_formats if af != 'html']
            return raw_render_to_response(self.html_template,
                                      self.html_dictionary,
                                      context_instance=context)


def render_to_formatted_response(*args, **kwargs):
    """
    A shortcut to return a HttpResponse using L{FormattedResponse} helper class.
    See FormattedResponse for parameter details.
    """
    formatted_instance = FormattedResponse(*args, **kwargs)
    return formatted_instance.render()


def render_to_response(request, *args, **kwargs):
    '''A modified version of render_to_response with request always the first
       argument and the requestcontext is always passed.
    '''
    context = RequestContext(request)
    kwargs.setdefault('context_instance', context)
    return raw_render_to_response(*args, **kwargs)



def _get_traceback(self, exc_info=None):
    "Helper function to return the traceback as a string"
    import sys
    import traceback
    return '\n'.join(traceback.format_exception(*(exc_info or sys.exc_info())))


def email_admin_last_exception(request):
    """
    Email admin about the exception just caught. It's useful when we need to
    catch an exception nicely but still want to send admin an email about it.
    Email code were taken from django.core.handlers.base.BaseHandler.
    handle_uncaught_exception.

    Usage example (normally in a view):
                try:
                     raise ValueError
                except ValueError:
                     email_admin_last_exception(request)
                     return <some nicer response>
    """
    import sys
    from django.core.mail import mail_admins

    exc_info = sys.exc_info()

    if settings.DEBUG_PROPAGATE_EXCEPTIONS:
        raise

    if settings.DEBUG:
        from django.views import debug
        return debug.technical_500_response(request, *exc_info)

    # When DEBUG is False, send an error message to the admins.
    subject = 'Error (%s IP): %s' % ((request.META.get('REMOTE_ADDR') in settings.INTERNAL_IPS and 'internal' or 'EXTERNAL'), request.path)
    try:
        request_repr = repr(request)
    except:
        request_repr = "Request repr() unavailable"

    message = "%s\n\n%s" % (_get_traceback(exc_info), request_repr)
    mail_admins(subject, message, fail_silently=True)
