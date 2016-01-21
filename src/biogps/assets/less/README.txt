== Stylesheet Folder Organization ==

base.less
    Initialization file, referenced by django_compress.
    Imports all the other stylesheets.
    Sets variables for color values.

screen-base.less
    Handles baseline styling for common HTML elements (h1, h2, a, article, etc)

screen-half-1080.less
screen-medium.less
screen-small.less
    Each of these contain media queries for different resolutions.
    They only override size changes, and only where needed.


biogps/
    install.less
        Initialization file, imports all the other stylesheets.


flawless/
    We're using the stylesheet portion of Flaw{LESS} CSS, a framework that
    leverages LESS.JS to simplify the creation of flexible HTML5/CSS3 layouts.
    The main features we're using are the grid system and CSS3 shortcuts.
    
    Current version: 1.2
    http://github.com/DominikGuzei/flawless.css/
    
    addons/
        Contains reusable styles for inclusion in other definitions. Think of
        this as the "custom utils" folder.
        The presence and location of this folder is standard for FlawLESS, but
        everything in there was made by us (the BioGPS devs).
        
        Example: inline_block.less
        Provides the class ".inline_block" which can be used by other styles to
        achieve a fully cross-browser implementation of "display: inline-block"
    
    core/
        A few folders within core/ are not used, but remain in place to make
        drop-in upgrades to the framework straight-forward. Simply replace the
        full contents of this core/ folder with the latest from Git.
        development/ and production/js/ are not used by us at all.
        
        production/framework/
            This is the meat of FlawLESS, primarily the grid/ and css3/ folders
            which provide mixins that we use throughout BioGPS's stylesheets.
            To see which pieces we are using, consult the top-level base.less


reset/
    html5boilerplate.css
        Referenced by django_compress in settings_compress.py
        Current version: 0.9.5
        http://html5boilerplate.com/
    
    yui-base.css
        Referenced by django_compress in settings_compress.py
        http://developer.yahoo.com/yui/3/cssbase/
        http://developer.yahoo.com/yui/3/cssfonts/


jqueryui/
    port of Aristo theme (originally for Cappucino)
    http://taitems.tumblr.com/post/482577430/introducing-aristo-a-jquery-ui-theme
    modified for LESS by Marc

    install.less
        Initialization file, imports all the other stylesheets.
    
    colors.less
        Color variables used throughout the jQuery UI theme files.
        A few values are duplicates of those in base.less, solely because
        LESS (1.0.41 at time of writing) doesn't scope the variables from
        base.less in a way that would be accessible in here.
    
    jquery.ui.__.less
        These files are all ported from the above blog post with very little
        modification. They follow jQuery UI's standard theming structure.
    
    images/
        Various image files used by the theme.
