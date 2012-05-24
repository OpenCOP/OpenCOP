#!/bin/sh

# Main entry point into feature. Modify `updated` in tomcat if dev files
# change.

watch -n 0.1 ~/OpenCOP/scripts/checkIfUpdated.sh
