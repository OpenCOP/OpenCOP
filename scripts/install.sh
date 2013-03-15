#!/bin/sh

p="\n[OpenCOP Install] "

cd ~

echo "$p Installing OpenGeo-Suite"
wget -qO- http://apt.opengeo.org/gpg.key | sudo apt-key add -
sudo su -c "echo 'deb http://apt.opengeo.org/suite/v3/ubuntu lucid main' >> /etc/apt/sources.list"
sudo apt-get update
sudo apt-get install -y opengeo-suite

# install git
if git --version
then
  echo "$p git already installed"
else
  echo "$p install git"
  sudo apt-get install -y git-core
fi

# Install curl to use for REST calls to geoserver
if curl --help
then
  echo "$p curl already installed"
else
  echo "$p Installing curl"
  apt-get install -y curl
fi


# Install apache2 and configure proxy
if apache2 -v
then
  echo "$p Apache2 is already installed"
else
  echo "$p install apache2 and configure proxy"
  sudo apt-get install -y apache2
  # uncomment connector to port 8009 in /etc/tomcat6/server.xml
  sudo sed -ie 'N;N;N;s/ *<!-- *\n* *\(<Connector.*port="8009".*>\) *\n* *-->/    \1/g' /etc/tomcat6/server.xml
  sudo a2enmod proxy_ajp
  # add proxypass rules to /etc/apache2/sites-enabled/000-default
  sudo sed -ie "/<\/VirtualHost>/i\<Proxy *>    \n  Allow from 127.0.0.1    \n</Proxy>    \nProxyPass / ajp://localhost:8009/    \nProxyPassReverse / ajp://localhost:8009/    \n" /etc/apache2/sites-enabled/000-default
  sudo service apache2 restart
fi

# Prevent tomcat6 permgen errors
## TODO: This is different than what's on demo.geocent.com:
## JAVA_OPTS='-Djava.awt.headless=true -Xmx1024m -Xms1024M -XX:MaxPermSize=256m -XX:CompileCommand=exclude,net/sf/saxon/event/ReceivingContentHandler.startElement'
if grep -q 'MaxPermSize' /etc/default/tomcat6
then
  echo "$p PermSize already set in tomcat6 startup options"
else
  echo "$p Set permsize in tomcat6 startup options"
  sudo sed -ie '/^JAVA_OPTS=/s/"$/ -Djava.awt.headless=true -Xms1024m -Xmx1024m -Xrs -XX:PerfDataSamplingInterval=500 -XX:MaxPermSize=256m"/' /etc/default/tomcat6
fi

# install OpenCOP
echo "$p Getting and Building OpenCOP"
git clone git://github.com/OpenCOP/OpenCOP.git
mkdir OpenCOP/build
cd OpenCOP/src/main/webapp
jar cvf ../../../build/opencop.war .
sudo cp ~/OpenCOP/build/opencop.war /var/lib/tomcat6/webapps

cd ~

# Restart apache and tomcat
sudo service apache2 restart
sudo service tomcat6 restart


# setup postgres users
# Opengeo creates a postgres user named 'opengeo' with password 'opengeo'
sudo sed -ie '/postgres.*ident/s/ident/trust/' /etc/postgresql/9.2/main/pg_hba.conf
sudo sed -ie '/local.*ident/s/ident/trust/' /etc/postgresql/9.2/main/pg_hba.conf
sudo service postgresql restart

echo "Opengeo creates a postgres user named 'opengeo' with password 'opengeo' if asked to provide password"
sudo echo "*:*:*:opengeo:opengeo" > .pgpass
sudo chmod 0600 .pgpass

psql -U opengeo -c "CREATE ROLE opencop LOGIN ENCRYPTED PASSWORD '57levelsofeoc' INHERIT CREATEDB CREATEROLE;" -d postgres
psql -U opengeo -c "CREATE ROLE fmanager LOGIN ENCRYPTED PASSWORD 'md5247826c7fcf1dfcb0fe1b350cd0cda2e' INHERIT CREATEDB CREATEROLE;" -d postgres

psql -U opengeo -c "CREATE DATABASE opencop WITH OWNER = opencop CONNECTION LIMIT = -1;" -d postgres
psql -U opengeo -c "CREATE DATABASE dynamic_feature WITH ENCODING='UTF8' OWNER=fmanager TEMPLATE=template_postgis CONNECTION LIMIT=-1;" -d postgres

echo "$p postgis-ify databases"
createlang plpgsql -U opengeo dynamic_feature
psql -U opengeo -f /usr/share/postgresql/9.2/contrib/postgis-2.0/postgis.sql -d dynamic_feature

psql -U opengeo opencop -f OpenCOP/db-setup/icon.sql
psql -U opengeo opencop -f OpenCOP/db-setup/hswg_icons.sql  # relies on icon.sql having run
psql -U opengeo opencop -f OpenCOP/db-setup/populate-db.sql


# Add the opencop workspace/namespace
## TODO: Check the return values from these calls
echo -n "$p Adding opencop workspace..."
response=`curl -s -u admin:geoserver --write-out %{http_code} -XPOST -H 'Content-type: text/xml' -d '<namespace><uri>http://opencop.geocent.com</uri><prefix>opencop</prefix></namespace>' http://localhost:8080/geoserver/rest/namespaces`
if [ "$response" = "201" ]; then
    echo "Success."
else
    echo "Failed. $response"
    exit 1
fi


echo -n "$p Adding the opencop data store..."
## TODO: Not all the params are specified here(spaces in, for example, "max connections", hose up the xml). Doesn't appear they need to be, but...
response=`curl -s -u admin:geoserver --write-out %{http_code} -XPOST -H 'Content-type: text/xml' -d "<dataStore><name>opencop</name><enabled>true</enabled><connectionParameters><host>localhost</host><port>5432</port><database>opencop</database><user>opengeo</user><dbtype>postgis</dbtype><passwd>opengeo</passwd></connectionParameters></dataStore>" http://localhost:8080/geoserver/rest/workspaces/opencop/datastores`
if [ "$response" = "201" ]; then
    echo "Success."
else
    echo "Failedcd . $response"
    exit 1
fi


for layername in "baselayer" "config" "icon" "iconmaster" "iconstolayers" "layer" "layergroup"
do
echo -n "$p Publishing $layername layer... "
response=`curl -s -u admin:geoserver --write-out %{http_code} -XPOST -H 'Content-type: text/xml' -d "<featureType><name>$layername</name><srs>EPSG:4326</srs><nativeBoundingBox><minx>0</minx><miny>0</miny><maxx>-1</maxx><maxy>-1</maxy></nativeBoundingBox><latLonBoundingBox><minx>-1</minx><miny>-1</miny><maxx>0</maxx><maxy>0</maxy></latLonBoundingBox></featureType>" http://localhost:8080/geoserver/rest/workspaces/opencop/datastores/opencop/featuretypes`
if [ "$response" = "201" ]; then
    echo "Success."
else
    echo "Failed. $response"
    exit 1
fi
done

echo "$p OpenCOP install complete. Have a nice day."
