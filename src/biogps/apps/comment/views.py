from django.http import HttpResponse, HttpResponseRedirect
from django.contrib.comments import Comment
from django.shortcuts import render_to_response, get_object_or_404
from django.conf import settings
from django.contrib.sites.models import Site
from django.template import RequestContext
from biogps.utils.models import BioGPSModel
from threadedcomments.models import ThreadedComment
from threadedcomments.forms import ThreadedCommentForm
from biogps.utils.decorators import loginrequired
from datetime import datetime
from biogps.utils.restview import RestView
from biogps.utils.http import JSONResponse


@loginrequired
def secure_comment_form(request, modelType, objectID, commentID, commentMode):
    obj, con_type = BioGPSModel.get_object_and_ctype(modelType, pk=objectID)
    if obj:
        return render_to_response('comment/secure_comment_form.html',
                                  {'model_type': modelType, 'obj': obj,
                                   'object_id': objectID,
                                   'comment_id': commentID,
                                   'comment_mode': commentMode},
                                  context_instance=RequestContext(request))


class CommentSubmitView(RestView):
    '''This class defines views for REST URL:
        /comment/<modelType>/<objectID>/
    '''
    @loginrequired
    def post(self, request, modelType, objectID):
        # User has submitted new/reply comment - validate and save to DB.
        obj, con_type = BioGPSModel.get_object_and_ctype(modelType,
                                                         pk=objectID)
        comment_form = ThreadedCommentForm(target_object=obj,
                                           parent=request.POST['parent'],
                                           data=request.POST)
        if comment_form.is_valid():
            #parent_link = request.META['HTTP_REFERER']
            user_comment = comment_form.cleaned_data['comment']
            username = getattr(request.user, 'username')

            c = ThreadedComment()
            c.user_name = username
            c.user_id = getattr(request.user, 'id')
            c.comment = user_comment
            cleaned_parent = comment_form.cleaned_data['parent']
            if cleaned_parent is not None:
                #parent_link += '#%s' % cleaned_parent
                c.parent = get_object_or_404(ThreadedComment,
                                                 pk=cleaned_parent)
            c.object_pk = comment_form.cleaned_data['object_pk']
            c.content_type = con_type
            c.site = Site.objects.get_current()
            c.save()

            # Use new comment ID in link if no parent
            #if parent_link.find('#') == -1:
            #    parent_link += '#%s' % c.id

            # If missing request HTTP_REFERER re-direct to landing page
            http_referer = 'http://biogps.gnf.org/%s/%s/' % (modelType, objectID)
            try:
                http_referer = request.META['HTTP_REFERER']
            except KeyError:
                # No referer, possibly b/c of private browsing
                pass

            # If comment was made on plugin email owner bcc admins
            if con_type.model == 'biogpsplugin':
                from django.core.mail import EmailMessage
                msg = EmailMessage('[BioGPS] New comment on plugin: %s' %
                      obj.title, 'New comment:<br><br>%s<br>&nbsp;&nbsp;'\
                      ' -posted by %s<br><br>Link: %s' % (user_comment,
                  request.user.get_valid_name(), http_referer),
                #             request.user.get_valid_name(), parent_link),
                           settings.DEFAULT_FROM_EMAIL, [obj.owner.email],
                                          [i[1] for i in settings.ADMINS])
                msg.content_subtype = "html" 
 	        msg.send(fail_silently=False)

            # Re-direct to parent comment that user replied to.
            #return HttpResponseRedirect(parent_link)
            return HttpResponseRedirect(http_referer)
        else:
            return HttpResponse("A comment is required. Please use your\
                    browser's back button to edit your comment.")


class CommentEditView(RestView):
    '''This class defines views for REST URL:
        /comment/<modelType>/<objectID>/<commentID>/
    '''
    @loginrequired
    def put(self, request, modelType, objectID, commentID):
        # User has edited comment - validate and save to DB.
        obj, con_type = BioGPSModel.get_object_and_ctype(modelType,
                                                         pk=objectID)
        ''' To simplify new/editing comments into one template the 'parent'
        in the PUT is actually the commentID, not the parentID. This doesn't
        matter since we only use the 'parent' for validation briefly.'''
        comment_form = ThreadedCommentForm(target_object=obj,
                                           parent=request.PUT['parent'],
                                           data=request.PUT)
        data = {'success': False, 'commentID': commentID}
        if comment_form.is_valid():
            existing_comment = get_object_or_404(Comment, pk=commentID)
            if existing_comment.user == request.user:
                existing_comment.comment = comment_form.cleaned_data['comment']
                existing_comment.submit_date = datetime.now()
                existing_comment.save()
                data['success'] = True
        return JSONResponse(data)
