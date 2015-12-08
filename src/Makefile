V ?= 0

ROOT_DIR := $(shell pwd)
SRC_DIR = assets
JS_DIR = ${SRC_DIR}/js2
LESS_DIR = ${SRC_DIR}/less
TEST_DIR = test
BUILD_DIR = build

PREFIX = .
DIST_DIR = ${PREFIX}/${SRC_DIR}/dist

PYTHON ?= `which python`
DJANGO_COMPRESS_ARGS =
DJANGO_COMPRESS = ${PYTHON} manage.py synccompress ${DJANGO_COMPRESS_ARGS}

JS_ENGINE ?= `which node nodejs`
JS_COMPILER = ${JS_ENGINE} ${BUILD_DIR}/uglify.js --unsafe

JS_FILES = ${JS_DIR}/biogps/biogps.js

JS = ${DIST_DIR}/biogps.js
JS_MIN = ${DIST_DIR}/biogps.min.js

STEAL_COMPILER = ./js steal/buildjs biogps/biogps.html
JS_STEAL = ${JS_DIR}/biogps/production.js

DOC_COMPILER = ./documentjs/doc biogps/biogps.html

all: clean steal compress
	@@echo "----------------------"
	@@echo "BioGPS build complete!"


full: clean steal compress_force
	@@echo "---------------------------"
	@@echo "Full BioGPS build complete!"

${DIST_DIR}:
	@@mkdir -p ${DIST_DIR}


lint: steal
	@@if test ! -z ${JS_ENGINE}; then \
		echo "Checking BioGPS against JSLint..."; \
		${JS_ENGINE} build/jslint-check.js; \
	else \
		echo "You must have NodeJS installed in order to test BioGPS against JSLint."; \
	fi


# Set up a helper name for compiling the production steal JS file.
steal: ${JS_STEAL}
# Name the real task with the name of the desired output file.
# (standard Makefile practice.)
${JS_STEAL}:
	@@if test -d ${JS_DIR}; then \
		echo "Building steal dependency tree and compressing primary JavaScript packages."; \
		cd ${JS_DIR} && \
		${STEAL_COMPILER} && \
		cd ${ROOT_DIR} && \
		mv -v ${JS_STEAL} ${DIST_DIR}/ && \
		cp -v ${JS_DIR}/steal/steal.production.js ${DIST_DIR}/ && \
		mkdir -p ${DIST_DIR}/steal; cp -v ${JS_DIR}/steal/end.js ${DIST_DIR}/steal/ && \
		echo "Steal build process done."; \
	else \
		echo "Cannot find the JS2 folder."; \
	fi

docs:
	@@if test -d ${JS_DIR}; then \
		echo "Building primary JavaScript documentation."; \
		cd ${JS_DIR}; \
		${DOC_COMPILER}; \
		echo "DocumentJS build process done."; \
	else \
		echo "Cannot find the JS2 folder."; \
	fi

css: compress
less: compress
compress: djangocompress
djangocompress:
	@@echo "Building stylesheets and remaining JavaScript via Django-compress."
	@@if test -d ${JS_DIR}; then \
		rm -v ${DIST_DIR}/biogps.min.css; \
		cd biogps && \
		${DJANGO_COMPRESS}; \
	fi

compress_force:
	@@echo "+---------------------------------------------------------+"
	@@echo "| ALERT: This will take a while.                          |"
	@@echo "| Forcing recompression of ALL stylsheets and JavaScript. |"
	@@echo "+---------------------------------------------------------+"
	@${MAKE} compress DJANGO_COMPRESS_ARGS='--force'

clean_tmp:
	@@echo "Removing temp files from Less compilation:" ${LESS_DIR}
	@@rm -rfv ${LESS_DIR}/*_tmp.css

clean: clean_tmp
	@@echo "Emptying Distribution directory:" ${DIST_DIR}
	@@rm -rfv ${DIST_DIR}/*

	@@echo "Removing primary JS file:"
	@@rm -rfv ${JS_STEAL}

help:
	@@cat Makefile_help.txt

.PHONY: all full lint steal less css compress djangocompress compress_force clean_tmp clean help
