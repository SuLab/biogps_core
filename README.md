= BioGPS - the Gene Annotation Portal =
This file tree contains the source code for the user-facing web application
portion of BioGPS. It is written in Python and based primarily on Django.

In order to run a complete installation of BioGPS, several separate components
are required:
 * BioGPS UI (this project)
 * MyGene.info (gene annotation data)
 * ElasticSearch
 * PostgreSQL


= Installation =
The full process of setting up a BioGPS UI instance from scratch is complex and
not documented as well as it should be, yet. Here we provide a basic list of
software requirements to get started. Once these are in place, there is further
info about steps to take on the Trac wiki:
http://trac.gnf.org/compdisc/wiki/UIAppCheckout

== Baseline Required Software ==
Python 2.6+
Java JRE 1.6+ (for JS minification)
NodeJS 0.2.6+ (for LESS compilation)

== Python Packages ==
Extra Python software is required for a production installation, documented in "requirements.txt".

Additional Python software for development (optional) is documented in
"optional_dev.txt".

== Javascript dependencies ==
1. ExtJS v3.3.0
    http://extjs.cachefly.net/ext-3.3.0.zip
    extract full ExtJS package (not just ext-all.js) to src/assets/js/ext/3.3.0 folder

2. ExtJS plugin ManagedIFrame
    http://managediframe.googlecode.com/files/miframe2_1_5.zip
    Extract to src/assets/js/ext/plugins folder




= Credits =
== Active Developers ==
 * Chunlei Wu
 * Ian MacLeod
 * Andrew Su

== Past Contributors ==
 * Marc Leglise
 * Camilo Orozco
 * James Goodale
 * Jason Boyer

 
