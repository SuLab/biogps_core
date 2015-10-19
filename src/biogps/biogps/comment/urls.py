from django.conf.urls import patterns


urlpatterns = patterns('biogps.comment.views',
    (r'^(?P<modelType>.+)/(?P<objectID>\d+)/'
     r'secure_comment_form_(?P<commentID>\d+)_(?P<commentMode>.+)/$',
     'secure_comment_form'),
    (r'^(?P<modelType>.+)/(?P<objectID>\d+)/(?P<commentID>\d+)/$',
     'CommentEditView'),
    (r'^(?P<modelType>.+)/(?P<objectID>\d+)/$', 'CommentSubmitView'),
)
