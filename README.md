# BioGPS - the Gene Annotation Portal #
This file tree contains the source code for the user-facing web application
portion of BioGPS. It is written in Python and based primarily on Django.

In order to run a complete installation of BioGPS, several separate components
are required:

 * BioGPS UI (this project)
 * MyGene.info (gene annotation data)
 * ElasticSearch
 * PostgreSQL


## Installation ##

You can follow this [step-by-step instruction](https://bitbucket.org/sulab/biogps_core/wiki/setup) to setup a working folder to run BioGPS for development purpose.

The following are the all dependencies needed:

### Baseline Required Software ###
 * Python 2.6+
 * mercurial (for checking out his repo) *
 * Java JRE 1.6+ (for JS minification)
 * NodeJS 0.2.6+ (for LESS compilation)

### Python Packages ###
Extra Python software is required for a production installation, documented in "requirements.txt" and installed via pip:

    pip install -r requirements.txt

Additional Python software for development (optional) is documented in "optional_dev.txt":

    pip install -r optional_dev.txt

### Javascript dependencies ###
1. ExtJS v3.3.0

   Download from [this link](http://extjs.cachefly.net/ext-3.3.0.zip), and then extract full ExtJS package (not just ext-all.js) to **src/assets/js/ext/3.3.0** folder (need to "mkdir src/assets/js/ext" first).

2. ExtJS plugin ManagedIFrame

   Download from [this link](http://managediframe.googlecode.com/files/miframe2_1_5.zip), and then extract two files: miframe.js and miframe-debug.js to **src/assets/js/ext/plugins** folder.


## Credits ##
### Active Developers ###
 * Chunlei Wu
 * Ian MacLeod
 * Andrew Su

### Past Contributors ###
 * Marc Leglise
 * Camilo Orozco
 * James Goodale
 * Jason Boyer

