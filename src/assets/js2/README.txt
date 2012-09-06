This folder contains V2 of the BioGPS JavaScript code base.
It is based on JavaScriptMVC (javascriptmvc.com) v3.0.5.
Last updated at: 5:40 PM 03/23/11

It requires Java JRE 1.6 or greater.
Also need nodejs.

== Updating JavaScript MVC ==
src/assets/js2$ ./js documentjs/update
src/assets/js2$ ./js funcunit/update
src/assets/js2$ ./js jquery/update
src/assets/js2$ ./js steal/update


== Generating Documentation ==
src$ make docs
OR
src/assets/js2$ ./documentjs/doc biogps/biogps.html


== Running JS Tests ==
Open files in browser for unit tests and functional tests (respectively).
http://biogps-dev.gnf.org/assets/js2/biogps/qunit.html
http://biogps-dev.gnf.org/assets/js2/biogps/funcunit.html


== JS2 Project Folder Organization ==

biogps/
    biogps.js
        Application file, loads plugins and other JS files.  a.k.a. the initializer
    
    controllers/
    models/
    views/
    
    resources/
        3rd party plugins and scripts
        store.js
            Current version: 1.1.0
            https://github.com/marcuswestin/store.js
        
    
    qunit.html
        A page that runs our qunit tests.
    funcunit.html
        A page that runs our functional tests.
    test/
        QUnit and FuncUnit tests
    
    fixtures/
        Data for simulated ajax responses
    
    
    docs.html
        A page that displays generated documentation.
    docs/
        Generated documentation files (ignored by SVN)
    
    
    scripts/
        Scripts to document and compress the JS application


jquery-ui/
    jQuery UI Library
    Current version: 1.8.11
    http://jqueryui.com/
    
jquery-plugins/
    3rd party jQuery plugins




bootstrap/
    JS files loaded in the header of the document
    
    modernizr.js
        Current version: 1.6
        http://www.modernizr.com/
    
    css_browser_selector.js
        Current version: 0.4.0
        http://rafael.adm.br/css_browser_selector/
