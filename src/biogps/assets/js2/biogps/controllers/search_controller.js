steal.plugins(
    'jquery/controller'
).then(function( $ ) {
    /**
     * @tag controllers, home
     * Enables the header search bar and example links.
     */
    $.Controller.extend('Biogps.Controllers.Search',
    /* @Prototype */
    {
        /**
         * When this controller loads, it expects to be instatiated on a div
         * that has been pre-populated with the message text to display.
         * That div should also have an HTML5 data attribute that identifies
         * the message, to be used for determining if the user has already
         * dismissed it.
         */
        init: function(el){
            this.queryInput = this.find('#query');
            this.queryInput.addClass('blurred');
            this.defaultText = this.queryInput.val();
        },
        
        /**
    	 * Binds on the search box for when it is focused.
    	 * Removes the blurred class.
    	 * @param {Object} el The event target element.
    	 * @param {Object} ev The event being fired.
    	 */
    	"#query focusin" : function(el, ev){
    		el.removeClass('blurred');
    	},

    	/**
    	 * Binds on the search box for when it is blurred.
    	 * Adds the blurred class and inputs the default text if none was provided by the user.
    	 * @param {Object} el The event target element.
    	 * @param {Object} ev The event being fired.
    	 */
    	"#query focusout" : function(el, ev){
    		if( el.val() === '' ){
    			el.val( this.defaultText );
    		}
    		if( el.val() === this.defaultText ){
    		    el.addClass('blurred');
    		}
    	},
        
        /**
         * Responds to the search form being submitted.
         * Checks to ensure the search field has content, otherwise don't do
         * anything.
         * @param {jQuery} el A jQuery wrapped element.
         * @param {Event} ev A jQuery event whose default action is prevented.
         */
        "form submit" : function(el, ev){
            if( this.queryInput.val() === '' ){
                ev.preventDefault();
            }
        },
        
        /**
         * Initialize example searches
         */
        "#header-examples a click" : function(el, ev){
            ev.preventDefault();
            var query = el.data('query');
            this.queryInput.val( query ).removeClass('blurred');
        }
    });
});