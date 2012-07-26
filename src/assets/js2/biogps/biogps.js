// Display the loading indicator before we start stealing scripts.
(function(){
    var i = document.getElementById('global-ajax-indicator');
    if(i){ i.style.display = ''; }
})();

/*
 * @page index BioGPS
 * @tag home
 *
 * ###BioGPS
 *
 * We're just getting started with this complete refresh.
 *
 * * Plugin
 */
steal.plugins(
	'jquery/controller',			// a widget factory
	'jquery/controller/subscribe',  // subscribe to OpenAjax.hub
	'jquery/view/ejs',				// client side templates
	'jquery/model',					// Ajax wrappers
	'jquery/dom/fixture',			// simulated Ajax requests
	'jquery/dom/form_params',		// form data helper
	'jquery-plugins/jquery-tools',
	'jquery-plugins/jquery.MetaData',
	'jquery-plugins/jquery.NobleCount',
	'jquery-plugins/jquery.rating',
	'jquery-plugins/openid-selector',
	'jquery-ui'
)

.resources(                        // 3rd party scripts (like jQueryUI), in resources folder
    'ajax_errors',
    'json2',
    'store',
    'comments',
    'ratings')

.models(                           // loads files in models folder
    'gene',
    'plugin'
)

.controllers(                      // loads files in controllers folder
    'comment',
    'commentform',
    'favorite',
    'message',
    'pluginform',
    'search'
)

.views()                            // adds views to be added to build

.then(function($){
    $('html').removeClass('js-loading');

    // Initialize jQuery-Tools Tooltips for any DOM element with
    // class 'has-tooltip'. Each element must have one of:
    //      A) a title attribute
    //      B) a div directly after it with class 'tooltip'
    // http://flowplayer.org/tools/tooltip/index.html
    /*
    $('.has-tooltip').tooltip({
        effect: 'slide',
        bounce: true,
        direction: 'right',
        position: 'center right'
    });
    */

    // Initialize any jQuery UI Tabs and Buttons
    $('.jq-tabs').tabs();
    $('.jq-button').button();

    // Locate elements on the page that should trigger controller initialization.
    var commentDiv = $('#object-comments'),
        yourCommentDiv = $('#your-comment'),
        favoriteDiv = $('#object-favorite'),
        messageDiv = $('#header-message'),
        pluginForm = $('#plugin-form'),
        searchForm = $('#header-search');
        LoginForm = $('#login-form');
        OpenidForm = $('#openid_form');

    // If div length is not zero, initialize controller
    if (commentDiv.length) new Biogps.Controllers.Comment(commentDiv);
    if (yourCommentDiv.length) new Biogps.Controllers.Commentform(yourCommentDiv);
    if (favoriteDiv.length) new Biogps.Controllers.Favorite(favoriteDiv);
    if (messageDiv.length) new Biogps.Controllers.Message(messageDiv);
    if (pluginForm.length) new Biogps.Controllers.Pluginform(pluginForm);
    if (searchForm.length) new Biogps.Controllers.Search(searchForm);

    //for login page
    if (LoginForm.length) $('#id_username').focus();
    if (OpenidForm.length) openid.init('openid_url');
    //if (OpenidForm.length) openid.init('openid_identifier');


    // Retrieve last used gene from localstorage
    var g = store.get('lastused-gene');
    if( g ){
        var new_id = 'id=' + g.id;
        $('.btn-add-plugin').each( function(){
            this.href = this.href.replace('id=1017', new_id);
        });
    }


    // April Fools Day code here.
    // var today = new Date();
    // if(today.getMonth()===3 && today.getDate()===1){ }

    // End the initialization by hiding the loading indicator.
    $('#global-ajax-indicator').hide();
});




// Defined here to account for the static pages that don't load Ext.
String.prototype.trim = function() {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
}

// Capitalizes the first letter of the string.
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
