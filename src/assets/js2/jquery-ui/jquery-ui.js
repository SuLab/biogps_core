/*
 * @page jquery-ui jQuery UI
 * @plugin jquery-ui
 * @tag home
 *
 * ###jQuery UI
 *  
 * We currently include the full subset of jQuery UI.
 * This could be cut down to significantly reduce the final file size sent
 * to the client.
 */
steal(
    'jquery-ui-1.8.11.custom.min.js'
).then(function($){
    
    /*
     * Calls a popup window, using jQuery UI Dialog.
     * @param {Object} conf configure the popup window.
     */
    $.popup = function(conf) {
        var popupDiv = $('<div></div>'),
            _conf = {   // Default config
                style: 'redirect',
                title: 'Modal Popup',
                message: 'This is a modal popup, yay!',
                modal: false,
                html: null,
                width: 400
            };
        conf = $.extend(true, {}, _conf, conf);
        
        // Set up the body of the popup
        popupDiv.html( conf.html || '<p>'+conf.message+'</p>' );
        delete conf.html;
        popupDiv.dialog( conf );
    };
});
