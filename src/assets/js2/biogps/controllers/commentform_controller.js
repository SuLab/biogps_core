/**
 * Simple comment form controller for responding to Submit button and 
 * Cancel link clicks.
 * @codestart
 $('#comments').biogps_controllers_commentform();
 * @codeend
 * @tag controllers, home
 */
jQuery.Controller.extend('Biogps.Controllers.Commentform',
/* @Static */
{

},
/* @Prototype */
{
    /**
     * Posts the data to the server.
     * @param {jQuery} el The Reply form.
     */
    '.replyForm submit' : function(el, ev) {
        var submitButton = el.find('input[type=submit]');

        // Check to make sure we're not already submitting the form.
        if ( submitButton.hasClass('btn-loading') ) {
            ev.preventDefault();
        }
        else {
            // Disable submit button to prevent multiple POSTs
            submitButton.addClass('btn-loading').attr('value', 'Loading...');
            
            // Check for empty comment
            if (el.closest('form').find('textarea#id_comment').val() == "") {
                ev.preventDefault();
                var _dialog = $('<div></div>')
                    .html('<div class="ui-state-error ui-corner-all"><p><span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span>A comment is required.</p></div>')
    		        .dialog({
                        draggable: false,
                        modal: true,
                        resizable: false,
    			        title: 'Missing comment'
    		        });

                // Occassional bug launches two dialog windows - close first
                _dialog.dialog('close');
                _dialog.dialog('open');

                // Register click handler for dismissing dialog
                // Clicking anywhere outside of the dialog will dismiss it
                $('.ui-widget-overlay').bind('click', function (){
                    _dialog.dialog('close');
                    _dialog.dialog('destroy');
                });

                // Re-enable submit button
                submitButton.removeClass('btn-loading').attr('value', 'Save Reply');
            }
            // Else, the normal HTTP form submit occurs.
        }
    },

    /**
     * Posts the data to the server.
     * @param {jQuery} el The Edit form.
     */
    '.editForm submit' : function(el, ev) {
        // Disable submit button to prevent multiple PUTs
        var editButton = el.find('input[type=submit]');
        editButton.attr('disabled', 'disabled');

        ev.preventDefault();

        // Check for empty comment
        if (el.closest('form').find('textarea#id_comment').val() == "") {
            var _dialog = $('<div></div>')
                .html('<div class="ui-state-error ui-corner-all"><p><span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span>A comment is required.</p></div>')
		        .dialog({
                    draggable: false,
                    modal: true,
                    resizable: false,
			        title: 'Missing comment'
		        });

            // Occassional bug launches two dialog windows - close first
            _dialog.dialog('close');
            _dialog.dialog('open');

            // Re-enable submit button
            editButton.removeAttr('disabled');
        } else {
            // Send form data to server via ajax PUT.
            var formParent = el.parent('span');
            $.ajax({
              type: 'PUT',
              url: el[0].action,
              data: el.serialize(),
              success: function(data, textStatus, XMLHttpRequest) {
                // Replace form on page with edited comment
                el.parent().html(el.attr('comment').value);

                // Update display of edit time after ajax
                var successObj = $.parseJSON(XMLHttpRequest.responseText);
                $('#comment-timesince-' + successObj.commentID).html(
                  'a moment ago.');
                var origComment = formParent.nextAll('[class*="orig-comment"]');

                // Re-display comment author element
                origComment.nextAll('[class*="comment-author"]').show();

                // Remove original comment hidden span
                origComment.remove();
              },
              error: function(XMLHttpRequest) {
              }
            });
        }
    },
   
    /**
     * Unloads the reply form and restores the original content.
     * @param {jQuery} el The form's cancel link element.
     */
    '.replyCancel click' : function(el, ev) {
        ev.preventDefault();
        ev.stopPropagation();

        // Unload the form and un-hide the Reply link.
        this.element.nextAll('a.reply').show();
        this.element.find('form').remove();
    },
 
    /**
     * Unloads the edit form and restores the original content.
     * @param {jQuery} el The form's cancel link element.
     */
    '.editCancel click' : function(el, ev) {
        ev.preventDefault();
        ev.stopPropagation();

        // Unload the form and restore the original content.
        var _form = el.closest('form');
        var formParent = _form.parent('span');
        var origComment = formParent.nextAll('[class*="orig-comment"]');

        // Revert to original comment
        formParent.html( origComment.text() );

        // Re-display comment author element
        origComment.nextAll('[class*="comment-author"]').show();

        // Remove original comment hidden span
        origComment.remove();
    }
});
