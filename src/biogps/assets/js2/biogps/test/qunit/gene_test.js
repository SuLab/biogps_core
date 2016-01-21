module("Biogps.Models.Gene");

test("Static Class", function(){
    equals( Biogps.Models.Gene.fullName, "Biogps.Models.Gene", "fullName is right" );
});

test("hydrate", function(){
    var json = '{"id": "1017", "symbol": "cdk2"}',
        p = Biogps.Models.Gene.hydrate( json );
    
    equals( p.Class.fullName, "Biogps.Models.Gene","Class.fullName is right" );    
    equals( p.id, 1017, "returns correct ID" );
    equals( p.symbol, 'cdk2', "returns correct symbol");
});

test("findOne", function(){
    stop();
    // Valid Gene
    Biogps.Models.Gene.findOne( 1017, function( p ){
        equals( p.Class.fullName, "Biogps.Models.Gene","Class.fullName is right" );
        ok( p.id === 1017, "returns correct ID" );
        ok( p.title === "Gene expression/activity chart", "returns correct title" );
        start();
    }, function( xhr, status, errorObject ){
        ok( false, "Error callback should not have been reached." );
        start();
    });
});

test("findOne Errors", function(){
    stop();
    // Invalid Gene, test error handling
    Biogps.Models.Gene.findOne( 10000, function( p ){
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
    // Valid Gene
    Biogps.Models.Gene.findAll( {
        q: 'id:1017'
    }, function( res ){
        equals( res.length, 1, "returned one record");
        var p = res[0];
        equals( p.Class.fullName, "Biogps.Models.Gene","Class fullName is right" );
        equals( p.id, 1017, "returns correct ID" );
        equals( p.symbol, 'CDK2', "returns correct symbol");
        start();
    }, function( xhr, status, errorObject ){
        ok( false, "Error callback should not have been reached." );
        start();
    });
});
