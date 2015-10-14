from django.conf.urls.defaults import *

urlpatterns = patterns('biogps.comment.views',
                          (r'^(?P<modelType>.+)/(?P<objectID>\d+)/secure_comment_form_(?P<commentID>\d+)_(?P<commentMode>.+)/$', 'secure_comment_form'),
                          (r'^(?P<modelType>.+)/(?P<objectID>\d+)/(?P<commentID>\d+)/$', 'CommentEditView'),
                          (r'^(?P<modelType>.+)/(?P<objectID>\d+)/$', 'CommentSubmitView'),
                      )
