## Overview ##

OpenCOP is an open source collection of tools that enable cross platform sharing and editing of real time
GIS data layers.  OpenCOP began as a DHS SBIR and continues as an active project deployed for Emergency Management. 

Visit [OpenCOP Demo](http://demo.geocent.com/opencop) to play with a live version. 

Contact OpenCOP@geocent.com with any questions or employment inquiries.  

Most of the team works for [Geocent](http://geocent.com) 
and we are looking for more people who are smart and get things done to join the team.

## How to Install ##

### Ubuntu ###
The Ubuntu operating system is recommended for the easiest and quickest path to getting OpenCOP up and running.

An install script "install.sh" is provided in the [_scripts/_](https://github.com/OpenCOP/OpenCOP/tree/master/scripts) directory.  The script is tailored for the Ubuntu operating system (specifically Ubuntu 10.04).  Simply run the script either as the superuser or via 'sudo', and the script will take care of installing the necessary pieces such as the open-geo suite, postgres database, and the OpenCOP code.

You will be prompted for the username and password of the user account under which to install the OpenCOP code. This can be either an existing user, or a new user, in which case the script will create the user account for you.

During the install, the OpenGeo suite will prompt for the proxy, username, and password for the geoserver instance. These can be left at the defaults by hitting [ENTER]. It will also ask if you would like to configure PostGIS for the OpenGeo suite -- choose "Yes".  Other than that, the script should take care of everything else.

The script will install the following software:

- OpenJDK Java JDK
- Apache 2 HTTP server
- Apache Tomcat 6
- OpenGeo Suite (including GeoServer)
- PostGreSQL database (with PostGIS extensions)
- Git version control system
- cURL command-line network protocol tool
- OpenCOP software

### Other Operating Systems ###
OpenCOP and GeoServer are provided as .war files in the [OpenCOP/binaries](https://github.com/OpenCOP/binaries) repository.  These can be used on any operating system running Apache Tomcat, though additional configuration of a PostGres database will be necessary as well.  Instructions for this route will be available soon.