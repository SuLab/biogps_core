steal('base').then(function( $ ) {
    /**
     * @tag models, home
     * Wraps backend plugin services.  Enables 
     * [Biogps.Models.Plugin.static.findAll retrieving],
     * [Biogps.Models.Plugin.static.update updating],
     * [Biogps.Models.Plugin.static.destroy destroying], and
     * [Biogps.Models.Plugin.static.create creating] plugins.
     */
    Biogps.Models.Base.extend('Biogps.Models.Plugin',
    /* @Static */
    {
        /**
         * Retrieves a specific plugin from your backend services.
         * @param {Integer} id Primary Key of plugin to retrieve.
         * @param {Function} success a callback function that returns wrapped plugin objects.
         * @param {Function} error a callback function for an error in the ajax request.
         */
        findOne: function( id, success, error ){
            $.ajax({
                url: '/plugin/'+id+'/',
                type: 'get',
                dataType: 'json',
                success: function( json ){
                    success( new Biogps.Models.Plugin(json) );
                },
                error: error
            })
        },
        /**
     	 * Retrieves multiple plugins from your backend services.
     	 * @param {Object} params params that might refine your results.
     	 * @param {Function} success a callback function that returns wrapped gene objects.
     	 * @param {Function} error a callback function for an error in the ajax request.
     	 */
    	findAll: function( params, success, error ){
    		$.extend( params, {'in':'plugin'} );
            this._super( params, success, error );
    	},
        /**
         * Creates a plugin.
         * @param {Object} attrs A plugin's attributes.
         * @param {Function} success a callback function that indicates a successful create.  The data that comes back must have an ID property.
         * @param {Function} error a callback that should be called with an object of errors.
         */
        create: function( attrs, success, error ){
            $.ajax({
                url: '/plugin/',
                type: 'post',
                dataType: 'json',
                data: attrs,
                success: success,
                error: error
            });
        },
        /**
         * Updates a plugin's data.
         * @param {String} id A unique id representing your plugin.
         * @param {Object} attrs Data to update your plugin with.
         * @param {Function} success a callback function that indicates a successful update.
         * @param {Function} error a callback that should be called with an object of errors.
         */
        update: function( id, attrs, success, error ){
            $.ajax({
                url: '/plugin/'+id+'/',
                type: 'put',
                dataType: 'json',
                data: attrs,
                success: success,
                error: error
            });
        },
        /**
         * Destroys a plugin's data.
         * @param {String} id A unique id representing your plugin.
         * @param {Function} success a callback function that indicates a successful destroy.
         * @param {Function} error a callback that should be called with an object of errors.
         */
        destroy: function( id, success, error ){
            $.ajax({
                url: '/plugin/'+id+'/',
                type: 'delete',
                dataType: 'json',
                success: success,
                error: error
            });
        }
    },
    
    /* @Prototype */
    {
        /*
         * Setter for Title attribute. Called on object creation.
         * When this gets called, it means our JSON stream included the attribute
         * 'title' instead of the common 'name'. This makes 'name' available.
         * Do not call this function directly.
         */
        setTitle: function( raw ){
            this.name = raw;
            return raw;
        }
    });
});