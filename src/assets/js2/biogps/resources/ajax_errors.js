/**
 * @page ajax_errors AJAX Error Handling
 * @parent home
 * @tag home
 * jQuery Ajax Error Handler for BioGPS
 * Globally catches error responses to AJAX requests and provides
 * proper handling.
 */

steal.plugins('jquery','jquery-plugins/jquery-tools').then(function($) {
    var _doc = $(document);
    
    _doc.ajaxSend(function spinnerStart(event, xhr, ajaxOptions) {
        $('#global-ajax-indicator').show();
        /*
        console.log('Triggered: ajaxSend with this = %o', this);
        $(this).append('<img class="ajax-spinner" src="/assets/img2/ajax-loader.gif">')
        $(this).append('.STARTING.');
        */
    });
    
    _doc.ajaxComplete(function spinnerStop(event, xhr, ajaxOptions) {
        $('#global-ajax-indicator').hide();
        /*
        console.log('Triggered: ajaxComplete with this = %o', this);
        $(this).remove('.ajax-spinner');
        $(this).append('.DONE.');
        */
    });
    
    _doc.ajaxError(function biogpsErrorHandler(event, xhr, ajaxOptions, thrownError) {
        if ( xhr.status == '403' ) { // Forbidden
            // Logged in?
            // NO: redirect to login page.
            // YES: access denied error.
            $.popup({
                title: 'Login Required',
                message: 'You must log in to continue.',
                modal: false // change back to true once we implement the button
            });
        }
        else if ( xhr.status == 404 ) { // Not Found
            // Missing page
            $.popup({
                title: 'Oh Snap!',
                body: "We can't find the page you were looking for."
            });
        }
        else if ( xhr.status == '400' ) { // Form submission errors
            // Pass
            // Should be handled by the individual form's error handler.
        }
        /*
        else if ( xhr.status == '406' ) { // Not Acceptable
            // Returned by the service layer?
        }
        else if ( xhr.status == '500' ) { // Internal Server Error
        }
        */
        else {
            // Handling for all other 4xx and 5xx error codes.
            // These should probably just be displayed directly.
            // No need for special handling since we only get these once in a
            // great while. Ex: 502 Bad Gateway.
            alert("There was an ajax error!\nURL: "+ajaxOptions.url+"\nStatus: "+xhr.status);
        }
    });
});
