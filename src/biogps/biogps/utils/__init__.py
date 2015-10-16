import json
import types
import logging

from django.conf import settings

log = logging.getLogger('biogps_prod' if settings.RELEASE_MODE == 'prod' else 'biogps_dev')


#Misc. utility functions
def list2dict(list,keyitem,alwayslist=False):
    '''Return a dictionary with specified keyitem as key, others as values.
       keyitem can be an index or a sequence of indexes.
       For example: li=[['A','a',1],
                        ['B','a',2],
                        ['A','b',3]]
                    list2dict(li,0)---> {'A':[('a',1),('b',3)],
                                         'B':('a',2)}
       if alwayslist is True, values are always a list even there is only one item in it.
                    list2dict(li,0,True)---> {'A':[('a',1),('b',3)],
                                              'B':[('a',2),]}
    '''
    dict={}
    for x in list:
        if type(keyitem)==type(0):      #single item as key
            key=x[keyitem]
            value=tuple(x[:keyitem]+x[keyitem+1:])
        else:                           #
            key=tuple([x[i] for i in keyitem])
            value=tuple(sublist(x,keyitem,mode='-'))
        if len(value) == 1:      #single value
            value=value[0]
        if not dict.has_key(key):
            if alwayslist:
                dict[key] = [value,]
            else:
                dict[key]=value
        else:
            current_value=dict[key]
            if type(current_value) != type([]):
                current_value=[current_value,]
            current_value.append(value)
            dict[key]=current_value
    return dict


class dotdict(dict):
    def __getattr__(self, attr):
        value = self.get(attr, None)
        if type(value) is types.DictType:
            return dotdict(value)
        else:
            return value
    __setattr__= dict.__setitem__
    __delattr__= dict.__delitem__


def ask(prompt,options='YN'):
    '''Prompt Yes or No,return the upper case 'Y' or 'N'.'''
    options=options.upper()
    while 1:
        s=raw_input(prompt+'[%s]' % '|'.join(list(options))).strip().upper()
        if s in options: break
    return s
