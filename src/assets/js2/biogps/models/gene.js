steal('base').then(function( $ ) {
    /**
     * @tag models, home
     * Wraps backend gene services.  Enables 
     * [Biogps.Models.Gene.static.findAll retrieving],
     * [Biogps.Models.Gene.static.update updating],
     * [Biogps.Models.Gene.static.destroy destroying], and
     * [Biogps.Models.Gene.static.create creating] genes.
     */
    Biogps.Models.Base.extend('Biogps.Models.Gene',
    /* @Static */
    {
        /**
         * Retrieves a specific gene from your backend services.
         * @param {Integer} id Primary Key of plugin to retrieve.
         * @param {Function} success a callback function that returns wrapped plugin objects.
         * @param {Function} error a callback function for an error in the ajax request.
         */
        findOne: function( id, success, error ){
            $.ajax({
                url: '/gene/'+id+'/',
                type: 'get',
                dataType: 'json',
                success: function( json ){
                    success( new Biogps.Models.Gene(json) );
                },
                error: error
            })
        },
    	/**
     	 * Retrieves genes data from your backend services.
     	 * @param {Object} params params that might refine your results.
     	 * @param {Function} success a callback function that returns wrapped gene objects.
     	 * @param {Function} error a callback function for an error in the ajax request.
     	 */
    	findAll: function( params, success, error ){
            $.extend( params, {'in':'gene'} );
            this._super( params, success, error );
            /*
     		$.ajax({
     			url: '/search/gene/',
     			type: 'get',
     			dataType: 'json',
     			data: params,
                 // success: this.callback(['wrapMany',success]),
     			success: function( json ){
     			    var parsedData = Biogps.Models.Gene.parseSearch( json ),
     			        wrapped = Biogps.Models.Gene.wrapMany( parsedData );
     			    success( wrapped );
     			},
     			error: error
     		});
     		*/
     	}
    },
    /* @Prototype */
    {});
});