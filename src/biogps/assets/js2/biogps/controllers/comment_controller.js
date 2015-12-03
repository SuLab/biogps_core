/**
 * Simple comment controller for responding to Reply and Edit link clicks.
 * @codestart
 $('#comments').biogps_controllers_comment();
 * @codeend
 * @tag controllers, home
 */
$.Controller.extend('Biogps.Controllers.Comment',
/* @Prototype */
{
    /**
     * Creates and places the reply interface.
     * @param {jQuery} el The comment's reply link element.
     */
    '.reply click' : function(el, ev) {
        // Load the remote reply form
        ev.preventDefault();

        // Apply loading class, change link text
        el.addClass("btn-loading").text('Loading...');

        var modelType = el.data("options").modelType;
        var objectID = el.data("options").objectID;
        var commentID = el.data("options").commentID;
        var parentID = el.data("options").parentID;
        // If no parent, set this comment as the parent
        parentID = (!parentID) ? commentID : parentID;

        $.ajax({
          url: '/comment/' + modelType + '/' + objectID +
               '/secure_comment_form_' + parentID + '_reply/',
          dataType: 'html',
          success: function(data, textStatus) {
            // Hide Reply link
            el.hide()

            // Remove loading class, change link text
            el.removeClass("btn-loading").text('Reply');

            var replyForm = $('#reply-form-' + commentID);
            new Biogps.Controllers.Commentform( replyForm );

            // Insert form into page, add focus
            replyForm.html(data).find('#id_comment').focus();
          },
          error: function(XMLHttpRequest) {
          }
        });
    },
    
    /**
     * Creates and places the edit interface.
     * @param {jQuery} el The comment's edit link element.
     */
    '.edit click' : function(el, ev) {
        // Load the remote edit form
        ev.preventDefault();

        // Change link text
        el.text('Loading...');

        var modelType = el.data("options").modelType;
        var objectID = el.data("options").objectID;
        var commentID = el.data("options").commentID;
        var parentID = el.data("options").parentID;
        parentID = (parentID === 'None') ? 'noParent' : parentID;
        var editForm = $('#edit-form-' + parentID + '-' + commentID);
        new Biogps.Controllers.Commentform( editForm );
        var originalComment = editForm.text();
        editForm.after('<span style="display:none;" class="orig-comment">'
                       + originalComment + '</span>');

        $.ajax({
          url: '/comment/' + modelType + '/' + objectID +
               '/secure_comment_form_' + commentID + '_edit/',
          dataType: 'html',
          success: function(data, textStatus) {
            originalComment = $.trim(originalComment);

            // Insert edit form, set original comment, add focus
            editForm.html(data).find('#id_comment').val(originalComment).focus();

            // Hide author line
            editForm.next().nextAll('[class*="comment-author"]').hide();

            // Change link text
            el.text('Edit');
          },
          error: function(XMLHttpRequest) {
          }
        });
    }
});
