// add_friend.js
// Created: Mar 23, 2010

// Renders and processes the buttons on a BioGPS profile to add the user
// to your friends list.

(function($) {
    // ------------------------ Baseline setup ---------------------------

    // Set up the jQuery.metadata plugin to read a certain way.
    $.metadata.setType("attr","data");

    // Create a safe reference to the Controls object.
    var controls = function(obj) { return new wrapper(obj); };
    biogps.friendControls = controls;

    controls.init = function() {
        // Read in the initial data using the jQuery.metadata plugin.
        var profileData = $('#meta_profile').metadata();

        // Assign the read-in data hashes to the control object.
        controls.profile_fqu = profileData.fqu;

        // Call the rendering functions for all data to initialize the editing buttons.
        controls.renderFriendButton();
    };


    // ------------------------ Template Functions: ---------------------------

    // Called by the init method. Renders the Add Friend button.
    controls.renderFriendButton = function() {
        var newHtml = "<a onClick='biogps.friendControls.renderMessageBox();return false;' href='#' class='roundButton'>Add as a Friend</a>";
        $('#profileFriend').html( newHtml );
    };

    controls.renderMessageBox = function() {
        // Center the privacy control box in the window and show it.
        var box = $('#friendMessageBox'),
            top = 100,
            left = Math.max(($(window).width() - box.outerWidth()) / 2, 0),
            newHtml = "<h2>Add a Friend</h2>" +
                "<p>Write a message to be included with your friend request:</p>" +
                "<form action='javascript:void(null)' onsubmit='biogps.friendControls.addFriend(this,event);return false;'>" +
                "<textarea name='message' rows='3' cols='40'>I'd like to add you to my BioGPS network." +
                "</textarea><br><input type='submit' value='Send Request'></form>" +
                "<div class='profileControls'><a id='friendBoxClose' href='#'>close [x]</a></div>";

        box.html( newHtml );
        $('#friendBoxClose').click(function() { $('#friendMessageBox').hide();$('.popup-mask').hide(); });

        $('.popup-mask').show();
        box.css({top: top, left: left, position: 'absolute'});
        box.show();
    };

    controls.renderLoading = function() {
        var newHtml = "<span class='roundButton'><img src='/assets/img/loading.gif'>&nbsp;&nbsp;Contacting server</span>";
        $('#profileFriend').html( newHtml );
    };

    // Called when the friend request AJAX call was successful
    controls.renderRequestSent = function() {
        var newHtml = "<span class='roundButton'>Friend Request Sent</span>";
        $('#profileFriend').html( newHtml );
    };

    // Called when the friend request AJAX call failed
    controls.renderRequestFail = function(message) {
        if (!message) { message = 'Unknown server error.'; }
        var newHtml = "Request failed: <span class='error_message'>" + message + "</span>";
        $('#profileFriend').html( newHtml );
    };



    // ------------------------ Data Submission: ---------------------------

    // Called by the Add Friend button to initiate a friend request.
    // Hits the server's EXT Direct methods, so we fake some appropriate params
    // here to fool the server.
    controls.addFriend = function(form, evt) {
        if (evt) {evt.cancelBubble=true;}

        var submitData = {
            extAction: 'friends',
            extMethod: 'invite_friend',
            extTID: 3, // huh?
            extType: 'rpc',
            extUpload: false,
            message: form.message.value.trim(),
            to_user: controls.profile_fqu
        };

        // Call the server to submit the info objects
        $.ajax({
            async: true,
            data: $.param(submitData),
            dataType: 'json',
            type: 'post',
            url: '/extdirect/remoting/router/',
            beforeSend: function(request){
                $('#friendBoxClose').click();
                controls.renderLoading();
            },
            success: function(data){
                if (data.result.success) { controls.renderRequestSent(); }
                else { controls.renderRequestFail( data.result.message ); }
            },
            failure: function(data){
                controls.renderRequestFail( data.result.message );
            }
        });
    };

})(jQuery);

jQuery(document).ready(function(){
    // If a div with ID 'edit_init' is present, then the editing controls should be enabled.
    if (jQuery('#profileFriend').length > 0) {
        biogps.friendControls.init();
    }
});