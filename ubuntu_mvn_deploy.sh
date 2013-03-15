#! /bin/bash

echo "build opencop war"
mvn clean install
echo "stop tomcat"
sudo service tomcat6 stop
echo "remove old war"
sudo rm -f /var/lib/tomcat6/webapps/opencop.war
echo "copy new war"
sudo cp target/opencop.war /var/lib/tomcat6/webapps/
echo "start tomcat"
sudo service tomcat6 start