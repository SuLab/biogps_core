from extdirect.django import remoting, ExtRemotingProvider, ExtPollingProvider

from django.conf import settings
from django.core.urlresolvers import clear_url_caches
from biogps.utils.helper import json

#add a new method to the original ExtRemotingProvider class
class ExtRemotingProvider2(ExtRemotingProvider):
    def api2(self):
        '''return a js code block without dependence of Ext. no use of "Ext.ns". '''
        descriptor = self.namespace + '.' + self.descriptor
        response = """
%s={};
%s = %s;
""" % (self.namespace, descriptor, json.dumps(self._config))
        return response

remote_provider = ExtRemotingProvider2(namespace='biogps.ed', url='/extdirect/remoting/router/')
polling_provider = ExtPollingProvider(url='/extdirect/polling/router/', event='some-event')

'''
@remoting(remote_provider, action='user')
def list(request):
    pass

@remoting(remote_provider, action='user', form_handler=True)
def update(request):
    return dict(success=True, data=[request.POST['username'], request.POST['password']])

@remoting(remote_provider, action='posts', len=1)
def all(request):
    #just return the recieved data
    return dict(success=True, data=request.extdirect_post_data)

@remoting(remote_provider)
def module_action(request):
    return dict(success=True)

@remoting(remote_provider, action='errors')
def error(request):
  return "A common mistake" + 1
'''

