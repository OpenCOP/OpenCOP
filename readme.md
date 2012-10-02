## Overview ##

OpenCOP is an open source collection of tools that enables cross platform sharing and editing of real time
GIS data layers.  OpenCOP began as a DHS SBIR and continues as an active project deployed for Emergency Management.

Visit [OpenCOP Demo](http://demo.geocent.com/opencop) to play with a live version.

Contact <OpenCOP@geocent.com> with any questions or employment inquiries.

Most of the team works for [Geocent](http://geocent.com)
and we are looking for more people who are smart and get things done to join the team.

## How to Install ##

### Ubuntu ###
The Ubuntu operating system is recommended for the easiest and quickest path to getting OpenCOP up and running.

An install script "install.sh" is provided in the [_scripts/_](https://github.com/OpenCOP/OpenCOP/tree/master/scripts) directory.  The script is tailored for the Ubuntu operating system (specifically [Ubuntu 10.04][lucid]).  Simply run the script either as the superuser or via 'sudo', and the script will take care of installing the necessary pieces such as the open-geo suite, postgres database, and the OpenCOP code.

[lucid]: http://releases.ubuntu.com/lucid/

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

### MS Windows ###

Installing OpenCOP on Internet Information Services and SQL Server (Tested on Windows Server 2003 and SQL Server 2008)

1. Download and install the Tomcat ISAPI filter [Tomcat and IIS Howto](http://wiki.apache.org/tomcat/Tomcat_and_IIS_Howto)
	- Modify the configuration files to match your setup

2. The security account that your IIS Application Pool (IE. NetworkService) must be able to read the folder
   containing the config file, and must have read/write access to the folder containing the log file.
   Example: The ISAPI filter installs itself in
   (C:\Program Files\Apache Software Foundation\Tomcat Isapi Redirect 1.2.32) by default, so your IIS user
   will need read access to the subdirectory "conf" and read/write access to the subdirectory "log"

3. In the IIS Manager, you must allow the web service extension:
	- Under "Web Service Extensions" click "Add New Web service extension..."
	- Type a name for the extension (example: Jakarta)
	- Enter the path of the DLL of the ISAPI filter (example: C:\Program Files\Apache Software Foundation\Tomcat Isapi Redirect 1.2.32\isapi_redirect.dll)
	- Once the extension is added, highlight it and click the "Allow" button

4. Right-click on your web site (example: Default Web Site) and select the "ISAPI Filters" tab.
	- Click the "Add" button to create a new filter
	- Name the filter "Jakarta"
	- Enter the path of the DLL of the ISAPI filter (example: C:\Program Files\Apache Software Foundation\Tomcat Isapi Redirect 1.2.32\isapi_redirect.dll)
	- Hit "OK" and the Jakarta filter should now be in the list
	- NOTE: You cannot nest ISAPI filters, if you add one to the top-level "Web Sites" folder, do not
	  add a filter to a sub folder or site also. The filter will get called twice and cause errors.

5. Build or download the OpenCOP and GeoServer WAR files.

6. Place the WAR files in your tomcat directory, tomcat should automatically expand and deploy the packages.

7. If you are going to use a SQL Server backend, you must install the necessary JAR files needed for GeoServer to access your SQL Server instance from
   [GeoServer SQL Server Modules](http://docs.geoserver.org/latest/en/user/data/sqlserver.html)
	- You will need the required JAR files in the WEB-INF/lib folder under your GeoServer installation in tomcat
	- There is a SQL Script in the "db-setup" folder that will create the OpenCOP database schema information, you
	  must modify the script to suit your needs prior to running it

### Other Operating Systems ###
OpenCOP and GeoServer are provided as .war files in the [OpenCOP/binaries](https://github.com/OpenCOP/binaries) repository.  These can be used on any operating system running Apache Tomcat, though additional configuration of a PostGres database will be necessary as well.  Instructions for this route will be available soon.
