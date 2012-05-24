#!/bin/sh

# Utility script for `startWatch.sh`. Updates the `updated` file in
# tomcat if any of the dev files have changed.

find ~/OpenCOP/web_app/ -type f | grep -v "/images/\|/lib/" | xargs stat | grep "Change\|File" > /var/lib/tomcat6/webapps/opencop/updated
