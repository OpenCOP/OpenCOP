#!/bin/sh

# Modify `updated` in tomcat if dev files change.
#
# If using tomcat, it's recommended to make the following change so that
# changes to `updated` show immediately. In `/etc/tomcat6/context.xml`,
# add `cachingAllowed="false"` to the `<Context>` element.

watch -n 0.1 'find ~/OpenCOP/src/main/webapp -type f | grep -v "/images/\|/lib/" | xargs stat | grep "Change\|File" > /var/lib/tomcat6/webapps/opencop-updated/updated'
