from django.conf.urls import url

from biogps.comment import views


urlpatterns = [
    url(r'^(?P<modelType>.+)/(?P<objectID>\d+)/'
        r'secure_comment_form_(?P<commentID>\d+)_(?P<commentMode>.+)/$',
        views.secure_comment_form),
    url(r'^(?P<modelType>.+)/(?P<objectID>\d+)/(?P<commentID>\d+)/$',
        views.CommentEditView),
    url(r'^(?P<modelType>.+)/(?P<objectID>\d+)/$', views.CommentSubmitView),
]
