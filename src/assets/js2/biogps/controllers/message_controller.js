steal(
    '../resources/store'
).then(function( $ ) {
    /**
     * @tag controllers, home
     * Enables the header banner display of messages, StackOverflow-style.
     * In the BioGPS implementation, we expect the base_site.html template to
     * include <div id="header-message"> with the appropriate data.
     */
    $.Controller.extend('Biogps.Controllers.Message',
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
            this.mid = this.element.data('messageid');
            
            var shown = store.get('messages-shown');
            this.shown = shown ? shown.split(',') : [];

            if( $.inArray( this.mid, this.shown ) < 0 ){
                // Display the header alert
                this.element.fadeIn("slow");
            }
        },
        
        /**
         * Handles clicking on the message's close link.
         * Adds the message id string to the HTML5 LocalStorage to prevent
         * the same message from displaying again.
         */
        '.close-notify click' : function(el, ev){
            ev.preventDefault();
            this.element.fadeOut('slow');
            this.shown.push( this.mid );
            store.set( 'messages-shown', this.shown.join(',') );
        }
    });
});