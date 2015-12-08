module("plugin",{
	setup : function(){
		// open the page
		S.open("//biogps/biogps.html");
		
		//make sure there's at least one plugin on the page before running a test
		S('.plugin').exists()
	},
	//a helper function that creates a plugin
	create : function(){
		S("[name=name]").type("Ice")
	    S("[name=description]").type("Cold Water")
	    S("[type=submit]").click()
		S('.plugin:nth-child(2)').exists()
	}
})

test("plugins present", function(){
	ok(S('.plugin').size() >= 1, "There is at least one plugin")
})

test("create plugins", function(){
    
	this.create();
	
    S(function(){
		ok(S('.plugin:nth-child(2) td:first').text().match(/Ice/), "Typed Ice");
	})
})

test("edit plugins", function(){
    this.create();
	
	S('.plugin:nth-child(2) a.edit').click();
    S(".plugin input[name=name]").type(" Water")
    S(".plugin input[name=description]").type("\b\b\b\b\bTap Water")
    S(".update").click()
    S('.plugin:nth-child(2) .edit').exists(function(){
		
		ok( S('.plugin:nth-child(2) td:first').text().match(/Ice Water/), 
			"Typed Ice Water");
		 
		ok( S('.plugin:nth-child(2) td:nth-child(2)').text().match(/Cold Tap Water/), 
			"Typed Cold Tap Water");
	})

})


test("destroy", function(){
	this.create();

    S(".plugin:nth-child(2) .destroy").click();
	
	//makes the next confirmation return true
    S.confirm(true);
	
	S('.plugin:nth-child(2)').missing(function(){
		ok("destroyed");
	})
    
	
});