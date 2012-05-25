#!/bin/sh

# Modify `updated` in tomcat if dev files change.

watch -n 0.1 'find ~/OpenCOP/web_app/ -type f | grep -v "/images/\|/lib/" | xargs stat | grep "Change\|File" > /var/lib/tomcat6/webapps/opencop-updated/updated'
