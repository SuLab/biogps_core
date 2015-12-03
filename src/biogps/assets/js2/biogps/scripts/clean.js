//steal/js biogps/scripts/compress.js

load("steal/rhino/steal.js");
steal.plugins('steal/clean',function(){
	steal.clean('biogps/biogps.html',{indent_size: 1, indent_char: '\t'});
});
