module("Biogps.Models.Plugin");

test("Static Class", function(){
    equals( Biogps.Models.Plugin.fullName, "Biogps.Models.Plugin", "fullName is right" );
});

test("hydrate", function(){
    var json = '{"author": "demo Wu", "title": "test_gene_identifier", "id": 591}',
        p = Biogps.Models.Plugin.hydrate( json );
    
    ok( p );
    equals( p.Class.fullName, "Biogps.Models.Plugin","Class.fullName is right" );
    equals( p.id, 591, "returns correct ID" );
    equals( p.name, "test_gene_identifier", "returns correct name" );
});

test("findOne", function(){
    stop();
    // Valid plugin
    Biogps.Models.Plugin.findOne( 9, function( p ){
        ok( p );
        equals( p.Class.fullName, "Biogps.Models.Plugin","Class.fullName is right" );
        equals( p.id, 9, "returns correct ID" );
        equals( p.name, "Gene expression/activity chart", "returns correct name" );
        start();
    }, function( xhr, status, errorObject ){
        ok( false, "Error callback should not have been reached." );
        start();
    });
});

test("findOne Errors", function(){
    stop();
    // Invalid plugin, test error handling
    Biogps.Models.Plugin.findOne( 10000, function( p ){
        ok( false, "Success callback should not have been reached." );
        start();
    }, function( xhr, status, errorObject ){
        equals( xhr.status, "404", "XHR status" );
        equals( status, "error", "Error status message" );
        start();
    });
});

test("findAll", function(){
    stop();
    // Valid plugin
    Biogps.Models.Plugin.findAll( {
        q: 'id:9'
    }, function( res ){
        equals( res.length, 1, "returned one record");
        var p = res[0];
        equals( p.Class.fullName, "Biogps.Models.Plugin","Class.fullName" );
        equals( p.id, 9, "id" );
        equals( p.name, "Gene expression/activity chart", "name" );
        start();
    }, function( xhr, status, errorObject ){
        ok( false, "Error callback should not have been reached." );
        start();
    });
});

test("create", function(){
	stop(2000);
	new Biogps.Models.Plugin({title: "qunit_test_plugin", description: "delete me"}).save(
	function(plugin){
		start();
		ok( plugin );
        ok( plugin.id );
        equals( plugin.title, "qunit_test_plugin" );
	}, function( xhr, status, errorObject ){
        ok( false, "Error callback should not have been reached." );
        start();
    });
});

test("update", function(){
	stop(2000);
	Biogps.Models.Plugin.findOne( 591, function( p ){
	    notEqual( p.description, "QUNIT_TEST_UPDATE" );
	    p.update( {description: "QUNIT_TEST_UPDATE"}, function( p ){
	        start();
	        equals( p.description, "QUNIT_TEST_UPDATE" );
            // p.update( p.id, {description: "This is a test plugin."} );
	    }, function( xhr, status, errorObject ){
            ok( false, "update error callback should not have been reached." );
            start();
        });
	}, function( xhr, status, errorObject ){
        ok( false, "findOne error callback should not have been reached. Are you logged in?" );
        start();
    });
});


/*
test("findAll", function(){
	stop(2000);
	Biogps.Models.Plugin.findAll({}, function(plugins){
		start()
		ok(plugins)
        ok(plugins.length)
        ok(plugins[0].name)
        ok(plugins[0].description)
	});
})

test("create", function(){
	stop(2000);
	new Biogps.Models.Plugin({name: "dry cleaning", description: "take to street corner"}).save(function(plugin){
		start();
		ok(plugin);
        ok(plugin.id);
        equals(plugin.name,"dry cleaning")
        plugin.destroy()
	})
})
test("update" , function(){
	stop();
	new Biogps.Models.Plugin({name: "cook dinner", description: "chicken"}).
            save(function(plugin){
            	equals(plugin.description,"chicken");
        		plugin.update({description: "steak"},function(plugin){
        			start()
        			equals(plugin.description,"steak");
        			plugin.destroy();
        		})
            })

});
test("destroy", function(){
	stop(2000);
	new Biogps.Models.Plugin({name: "mow grass", description: "use riding mower"}).
            destroy(function(plugin){
            	start();
            	ok( true ,"Destroy called" )
            })
})
*/