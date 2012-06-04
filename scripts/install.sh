#!/bin/sh

# constants
p="\n[OpenCOP Install] "

# Check that the script is being run as root
if [ $(id -u) -ne 0 ]; then
	echo "Please use 'sudo' to run this script."
	exit 2
fi

confirmed="n"
while [ "x$confirmed" != "xy" ]
do

# Get the shell user to use
read -p "Enter the username for the account under which to install OpenCOP: " username

# Get shell user's password
passgood="no"
stty -echo
while [ $passgood = "no" ]
do
	read -p "Enter that user's password: " password; echo
	read -p "Enter that user's password again: " password2; echo
	if [ "$password" = "$password2" ]; then
		passgood="yes"
	else
		echo "Passwords don't match. Try again."
	fi
done
stty echo

# Get the IP address to install everything on
read -p "Enter the IP address to use for GeoServer/OpenCOP/postgres (Hit ENTER to use localhost): " localip

if [ "x$localip" = "x" ]; then
    localip="127.0.0.1"
fi

echo "You have entered:\n  Username: $username\n  IP: $localip"
read -p "Is this correct? (y/n): " confirmed

done

echo "$p Away we go..."

# vi for the masses!
if grep -q "set -o vi" ~/.bashrc
then
  echo "$p vi blissfully already configured"
else
  echo "$p configuring vi (we are, afterall, civilized)"
  set -o vi
  sed -ie '$a\\nset -o vi' ~/.bashrc
fi


# Install opengeo-suite
if grep opengeo /etc/apt/sources.list
then
  echo "$p opengeo-suite is already installed"
else
  echo "$p Installing open-geo suite"
  wget -qO- http://apt.opengeo.org/gpg.key | sudo apt-key add -
  sudo sh -c "echo \"deb http://apt.opengeo.org/ubuntu lucid main\" >> /etc/apt/sources.list"
  sudo apt-get update
  sudo apt-get install -y opengeo-suite
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
  sudo sed -ie "/<\/VirtualHost>/i\<Proxy *>    \n  Allow from 127.0.0.1    \n</Proxy>    \nProxyPass / ajp://$localip:8009/    \nProxyPassReverse / ajp://$localip:8009/    \n" /etc/apache2/sites-enabled/000-default
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

# Create build user
if id $username > /dev/null
then
	echo "$p User $username already exists"
else
	echo "$p Creating user $username"
	# Encrypt the password so we can pass it to useradd -p
	pass=$(perl -e 'print crypt($ARGV[0], "password")' $password)
	useradd -m -p $pass -s /bin/bash $username
	if [ $? -eq 0 ]; then
		echo "User $username has been added to system"
	else
		"Failed to add user $username"
		exit 1
	fi
fi

# give build user sudo access
if sudo grep -q $username /etc/sudoers
then
  echo "$p $username already has sudo rights"
else
  echo "$p give $username sudo rights"
  echo "$username   ALL=(ALL)       ALL" | sudo tee -a /etc/sudoers > /dev/null
fi

# install git
if git --version
then
  echo "$p git already installed"
else
  echo "$p install git"
  sudo apt-get install -y git-core
fi

# install maven
if mvn --version
then
  echo "$p maven already installed"
else
  echo "$p install maven"
  sudo apt-get install -y maven2
fi

# pull most recent source
if test -s /home/$username/OpenCOP/.git/
then
  echo "$p Pulling latest OpenCOP source code from github"
  sudo su $username -c 'cd ~/OpenCOP; git pull'
else
  echo "$p Downloading OpenCOP source code from github"
  sudo su $username -c 'cd; git clone git://github.com/OpenCOP/OpenCOP.git'
fi

# setup postgres users
if psql -U postgres -c '\du' | grep -q opencop
then
  echo "$p postgres users already exist"
else
  echo "$p create postgres users"
  sudo sed -ie '/postgres.*ident/s/ident/trust/' /etc/postgresql/8.4/main/pg_hba.conf
  sudo sed -ie '/local.*ident/s/ident/trust/' /etc/postgresql/8.4/main/pg_hba.conf
  sudo service postgresql-8.4 restart
  psql -U postgres -c "CREATE ROLE opencop LOGIN ENCRYPTED PASSWORD '57levelsofeoc' INHERIT CREATEDB CREATEROLE;"
  psql -U postgres -c "CREATE ROLE fmanager LOGIN ENCRYPTED PASSWORD '57levelsofeoc' INHERIT CREATEDB CREATEROLE;"
fi

# create databases (and postgis-ify them)
if psql -U postgres -c "\l" | grep -q opencop
then
  echo "$p necessary databases already exist"
else
  echo "$p create databases"
  psql -U postgres -c "CREATE DATABASE opencop WITH OWNER = opencop CONNECTION LIMIT = -1;"
  psql -U postgres -c "CREATE DATABASE sandbox WITH ENCODING='UTF8' OWNER=fmanager TEMPLATE=template_postgis CONNECTION LIMIT=-1;"

  echo "$p postgis-ify databases"
  createlang plpgsql -U postgres sandbox
  psql -U fmanager -f /usr/share/postgresql/8.4/contrib/postgis-1.5/postgis.sql -d sandbox
  psql -U postgres sandbox -c "alter table geometry_columns owner to fmanager"
  psql -U postgres sandbox -c "alter table geography_columns owner to fmanager"
  psql -U postgres sandbox -c "alter table spatial_ref_sys owner to fmanager"
fi


# Run the local_deploy script
## TODO: Or run this as tomcat6 instead (if that works)
echo "$p Running local_deploy script"
su $username -c 'cd ~/OpenCOP; sh ./local_deploy'

# Kinda hacky: The war copy will fail in local_deploy because the user doesn't have permissions to the tomcat directory
# So copy it here
cp /home/$username/OpenCOP/target/opencop.war /var/lib/tomcat6/webapps

# Restart apache and tomcat
sudo service apache2 restart
sudo service tomcat6 restart


# TODO: Will need to move the icons folder from OC1 to OC2 and do this again
# move icons folder
#echo "$p move icons folder from source to tomcat"
#sudo cp -ur /home/$username/OpenCOP/opencop-icons/ /var/lib/tomcat6/webapps/


# Install curl to use for REST calls to geoserver
echo "$p Installing curl"
apt-get install curl

# Wait for Geoserver to come up
geoserver_up="false"
echo -n "$p Waiting for Geoserver to come up. This may take a minute or two..."

while [ $geoserver_up != "true" ]
do
	response=`curl -s -XGET -u admin:geoserver -H 'Accept: text/xml' http://$localip/geoserver/rest/workspaces/`

	greppage=`echo $response | grep workspace`

	if [ "x" != "x$greppage" ]; then
		echo "Done."
		geoserver_up="true"
	else
		echo -n "."
		sleep 3
	fi
done


# Populate the DB
echo "$p Running populate-db script"
su $username -c 'cd ~/OpenCOP/db-setup; sh ./populate-db'


############################################################
## Geoserver REST calls


# add workspaces/namespaces
## TODO: Check the return values from these calls
for workspace in "opencop" "sandbox"
do
  echo -n "$p Adding $workspace workspace..."
  response=`curl                                   \
    -s                                             \
    -u admin:geoserver                             \
    --write-out %{http_code}                       \
    -XPOST                                         \
    -H 'Content-type: text/xml'                    \
    -d "<namespace>                                \
          <uri>http://$workspace.geocent.com</uri> \
          <prefix>$workspace</prefix>              \
        </namespace>"                              \
    http://$localip/geoserver/rest/namespaces`
  if [ "$response" = "201" ]; then
      echo "Success."
  else
      echo "Failed. $response"
      exit 1
  fi
done

# add store: opencop
echo -n "$p Adding the opencop datastore..."
## TODO: Not all the params are specified here(spaces in, for example,
## "max connections", hose up the xml). Doesn't appear they need to be,
## but...
response=`curl                           \
  -s                                     \
  -u admin:geoserver                     \
  --write-out %{http_code}               \
  -XPOST                                 \
  -H 'Content-type: text/xml'            \
  -d "<dataStore>                        \
        <name>opencop</name>             \
        <connectionParameters>           \
          <host>$localip</host>          \
          <port>5432</port>              \
          <database>opencop</database>   \
          <user>opencop</user>           \
          <dbtype>postgis</dbtype>       \
          <passwd>57levelsofeoc</passwd> \
        </connectionParameters>          \
      </dataStore>"                      \
  http://$localip/geoserver/rest/workspaces/opencop/datastores`
if [ "$response" = "201" ]; then
    echo "Success."
else
    echo "Failed. $response"
    exit 1
fi

# add store: sandbox
echo -n "$p Adding the sandbox datastore..."
## TODO: Not all the params are specified here(spaces in, for example,
## "max connections", hose up the xml). Doesn't appear they need to be,
## but...
response=`curl                           \
  -s                                     \
  -u admin:geoserver                     \
  --write-out %{http_code}               \
  -XPOST                                 \
  -H 'Content-type: text/xml'            \
  -d "<dataStore>                        \
        <name>sandbox</name>             \
        <connectionParameters>           \
          <host>$localip</host>          \
          <port>5432</port>              \
          <database>sandbox</database>   \
          <user>fmanager</user>          \
          <dbtype>postgis</dbtype>       \
          <passwd>57levelsofeoc</passwd> \
        </connectionParameters>          \
      </dataStore>"                      \
  http://$localip/geoserver/rest/workspaces/sandbox/datastores`
if [ "$response" = "201" ]; then
    echo "Success."
else
    echo "Failed. $response"
    exit 1
fi

# add opencop (config) layers
for layername in "baselayer" "config" "icon"  \
                 "iconmaster" "iconstolayers" \
                 "layer" "layergroup" "default_layer"
do
  echo -n "$p Publishing $layername layer... "
  response=`curl                  \
    -s                            \
    -u admin:geoserver            \
    --write-out %{http_code}      \
    -XPOST                        \
    -H 'Content-type: text/xml'   \
    -d "<featureType>             \
          <name>$layername</name> \
          <srs>EPSG:4326</srs>    \
          <nativeBoundingBox>     \
            <minx>0</minx>        \
            <miny>0</miny>        \
            <maxx>-1</maxx>       \
            <maxy>-1</maxy>       \
          </nativeBoundingBox>    \
          <latLonBoundingBox>     \
            <minx>-1</minx>       \
            <miny>-1</miny>       \
            <maxx>0</maxx>        \
            <maxy>0</maxy>        \
          </latLonBoundingBox>    \
        </featureType>"           \
    http://$localip/geoserver/rest/workspaces/opencop/datastores/opencop/featuretypes`
  if [ "$response" = "201" ]; then
      echo "Success."
  else
      echo "Failed. $response"
      exit 1
  fi
done

# add sandbox (example) layers
for layername in "example"
do
  echo -n "$p Publishing $layername layer... "
  response=`curl                  \
    -s                            \
    -u admin:geoserver            \
    --write-out %{http_code}      \
    -XPOST                        \
    -H 'Content-type: text/xml'   \
    -d "<featureType>             \
          <name>$layername</name> \
          <srs>EPSG:4326</srs>    \
          <nativeBoundingBox>     \
            <minx>0</minx>        \
            <miny>0</miny>        \
            <maxx>-1</maxx>       \
            <maxy>-1</maxy>       \
          </nativeBoundingBox>    \
          <latLonBoundingBox>     \
            <minx>-1</minx>       \
            <miny>-1</miny>       \
            <maxx>0</maxx>        \
            <maxy>0</maxy>        \
          </latLonBoundingBox>    \
        </featureType>"           \
    http://$localip/geoserver/rest/workspaces/sandbox/datastores/sandbox/featuretypes`
  if [ "$response" = "201" ]; then
      echo "Success."
  else
      echo "Failed. $response"
      exit 1
  fi
done

# delete those layergroups we don't care about
for layergroup in "world" "world" "medford" "medford"
do
  echo -n "$p Deleting '$layergroup' layer group..."
  response=`curl             \
    -s                       \
    -u admin:geoserver       \
    --write-out %{http_code} \
    -X DELETE                \
    http://$localip/geoserver/rest/layergroups/$layergroup`
  if [ "$response" = "200" ]; then
      echo "Success."
  else
      echo "Failed. $response"
      exit 1
  fi
done

# move ftls around to where they should go
sudo cp /home/$username/OpenCOP/ftls/content.ftl \
  /usr/share/opengeo-suite-data/geoserver_data/workspaces/content.ftl
sudo cp /home/$username/OpenCOP/ftls/description.ftl \
  /usr/share/opengeo-suite-data/geoserver_data/workspaces/sandbox/description.ftl


############################################################
## creating geocent style

# create geocent style
echo -n "$p Creating Geocent style..."
response=`curl                           \
  -s                                     \
  --write-out %{http_code}               \
  -u admin:geoserver                     \
  -XPOST                                 \
  -H 'Content-type: text/xml'            \
  -d '<style>                            \
        <name>geocent</name>             \
        <filename>geocent.sld</filename> \
      </style>'                          \
  http://$localip/geoserver/rest/styles`
if [ "$response" = "201" ]; then
    echo "Success."
else
    echo "Failed. $response"
    exit 1
fi

# upload geocent style
echo -n "$p Uploading Geocent style..."
response=`curl                                   \
  -s                                             \
  --write-out %{http_code}                       \
  -u admin:geoserver                             \
  -XPUT                                          \
  -H 'Content-type: application/vnd.ogc.sld+xml' \
  -d @/home/$username/OpenCOP/slds/geocent.sld   \
  http://$localip/geoserver/rest/styles/geocent`
if [ "$response" = "200" ]; then
    echo "Success."
else
    echo "Failed. $response"
    exit 1
fi

# apply geocent style to example layer
echo -n "$p Apply Geocent style to example layer..."
response=`curl                 \
  -s                           \
  --write-out %{http_code}     \
  -u admin:geoserver           \
  -XPUT                        \
  -H 'Content-type: text/xml'  \
  -d '<layer>                  \
        <defaultStyle>         \
          <name>geocent</name> \
        </defaultStyle>        \
      </layer>'                \
  http://$localip/geoserver/rest/layers/sandbox:example`
if [ "$response" = "200" ]; then
    echo "Success."
else
    echo "Failed. $response"
    exit 1
fi


############################################################
## done, signing off

echo "$p OpenCOP install complete. Have a nice day."

echo "$p Starting opencop..."
firefox "http://localhost/opencop"
