function showForm(mode, commentID, parentID) {
  var ajaxContext;
  if (mode == 'edit') {
    var formURL = 'secure_comment_form_' + commentID + '_' + mode + '.html';
    // Insert hidden original comment in case user cancels edit
    var editForm = $('#edit-form-' + parentID + '-' + commentID);
    var originalComment = editForm.text();
    editForm.after('<span style="display:none;">' + originalComment + '</span>');
    ajaxContext = editForm;
  } else if (mode == 'reply') {
    var replyID = (parentID === 'noParent') ? commentID : parentID;
    var formURL = 'secure_comment_form_' + replyID + '_' + mode + '.html';
    var replyForm = $('#reply-form-' + commentID);
    ajaxContext = replyForm;
  }
  $.ajax({
    url: formURL,
    context: ajaxContext,
    dataType: 'html',
    success: function(data, textStatus) {
      if (mode == 'reply') {
        replyForm.html(data);
      } else if (mode == 'edit') {
        originalComment = $.trim(originalComment);
        // Remove quotes at beginning and end that may be included
        var pattern = /^"/;
        var replacement = '';
        originalComment = originalComment.replace(pattern, replacement);
        pattern = /"$/;
        originalComment = originalComment.replace(pattern, replacement);
        editForm.html(data);
        editForm.children('form').children('p').children('textarea').val(originalComment);
      } 
    },
    error: function(XMLHttpRequest) {
      /*var errorObj = $.parseJSON(XMLHttpRequest.responseText);
      var formID;
      if (mode == 'reply') {
        formID = commentID;
      } else if (mode == 'edit') {
        formID = (parentID === 'noParent') ? commentID : parentID;
      }
      $('#reply-form-' + formID).html(errorObj.error);*/
    }
  });
}

steal.plugins('jquery').then(function($) {
  $(".editCommentForm :submit").live('click', function(event) {
    // Intercept edit form data, PUT via ajax
    var _buttonClicked = this;
    var _form = $(_buttonClicked).closest('form');
    var formParent = _form.parent('span');
    var origCommentParent = formParent.next('span')
    if (_buttonClicked.value == "Cancel") {
      // Revert to original comment
      formParent.html('<b>' + origCommentParent.text() + '</b>');
    } else if (_buttonClicked.value == "Edit") {
      $.ajax({
        type: 'PUT',
        context: _form,
        url: _form[0].action,
        data: _form.serialize(),
        success: function(data, textStatus, XMLHttpRequest) {
          // Replace form on page with edited comment
          _form.parent().html('<b>"' + _form.attr('comment').value +
                              '"</b>');
          // Update display of edit time after ajax
          var successObj = $.parseJSON(XMLHttpRequest.responseText);
          $('#comment-timesince-' + successObj.commentID).html('0 minutes ago.');
        },
        error: function(XMLHttpRequest) {
          var errorObj = $.parseJSON(XMLHttpRequest.responseText);
          _form.html(errorObj.error);
        }
      });
    }
    // Remove original comment
    origCommentParent.remove();

    // Prevent html form submission
    return false;
  });
});
