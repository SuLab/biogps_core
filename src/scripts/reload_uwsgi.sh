#!/bin/sh

#gracefully reload
kill -s HUP `cat ../../.tmp/uwsgi_master.pid`