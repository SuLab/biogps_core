steal.plugins('jquery/model').then(function( $ ) {
    /**
     * @tag models, home
     * Base class for all searchable models.  Enables 
     * [Biogps.Models.Base.static.findAll retrieving]
     * [Biogps.Models.Gene genes],
     * [Biogps.Models.Plugin plugins],
     * layouts, genelists and datasets.
     */
    $.Model.extend('Biogps.Models.Base',
    /* @Static */
    {
        // Enables the .Class function on instances of this class.
        classProperty : true,
        
        /**
         * Retrieves object data from your backend services.
         * @param {Object} params params that might refine your results.
         * @param {Function} success a callback function that returns wrapped objects.
         * @param {Function} error a callback function for an error in the ajax request.
         */
        findAll: function( params, success, error ){
            $.extend( params, {'fields':'_source'} );
     		$.ajax({
     			url: '/search/',
     			type: 'get',
     			dataType: 'json',
     			data: params,
                // success: this.callback(['wrapMany',success]),
     			success: function( json ){
     			    var parsedData = Biogps.Models.Base.parseSearch( json ),
     			        wrapped = Biogps.Models.Base.wrapMany( parsedData );
     			    success( wrapped );
     			},
     			error: error
     		});
     	},
        
        /**
    	 * IN PROGRESS
    	 */
    	parseSearch: function( rawData ){
    	    if (!rawData || !rawData.hits || !rawData.hits.hits) {
				return null;
			}
			var res = [],
				raw = rawData.hits.hits,
				length = raw.length,
				i = 0;
			//@steal-remove-start
			if (! length ) {
				steal.dev.warn("model.js wrapMany has no data.  If you're trying to wrap 1 item, use wrap. ")
			}
			//@steal-remove-end
			res._use_call = true; //so we don't call next function with all of these
			for (; i < length; i++ ) {
				res.push(this.wrap(raw[i]._source));
			}
			return res;
    	},
    	
    	/**
         * Returns an instantiated object based on the passed in json.
         * @param {String} json Data to instantiate your plugin with.
         * @returns {Object} Biogps.Models.Base
         */
        hydrate: function( json ){
            return this.wrap( $.parseJSON( json ) );
        },
        
        /**
		 * Wrap is used to create a new instance from data returned from the server.
		 * It is very similar to doing <code> new Model(attributes) </code> 
		 * except that wrap will check if the data passed has an
		 * 
		 * - attributes,
		 * - data, or
		 * - <i>singularName</i>
		 * 
		 * property.  If it does, it will use that objects attributes.
		 * 
		 * Wrap is really a convience method for servers that don't return just attributes.
		 * 
		 * @param {Object} attributes
		 * @return {Model} an instance of the model
		 */
		wrap: function( attributes ) {
			if( !attributes ) {
				return null;
			}
			if( attributes['in'] ) {
			    var classType = Biogps.Models[attributes['in'].capitalize()];
			    return new classType( attributes );
			}
			return new this(
			// checks for properties in an object (like rails 2.0 gives);
			attributes[this.singularName] || attributes.data || attributes.attributes || attributes);
		}
    },
    /* @Prototype */
    {})
});
