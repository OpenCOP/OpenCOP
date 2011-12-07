------------------------------------------------------------
---- description

-- given that these exist:
--   - opencop database
--   - opencop user
--
-- destroy, recreate, and populate the tables in the opencop database


------------------------------------------------------------
---- additional setup (first time only)

-- create necessary databases and users
--
--   $ createdb -U postgres opencop
--   $ createuser -U postgres opencop
--   $ psql -U opencop opencop
--   eoc=# \password
--   eoc=# \q
--   $ ./populate-db  ; runs this script
--
-- point geoserver to the new layers
--
--   make opencop workspace
--
--     name      : opencop
--     namespace : http://opencop.geocent.com
--
--   make opencop postgis store
--
--   publish all tables as layers


------------------------------------------------------------
---- base layers

drop table baselayer;

create table baselayer (
  id integer primary key,
  brand character varying(20),
  type character varying(20),
  name character varying(100),
  isdefault boolean,
  numzoomlevels integer
);

insert into baselayer values (0, 'yahoo' , ''         , 'Yahoo'           , false, 0)  ; -- zoom level not used
insert into baselayer values (1, 'google', 'satellite', 'Google Satellite', false, 22) ;
insert into baselayer values (2, 'google', 'physical' , 'Google Physical' , true , 22) ; -- zoom level not confirmed
insert into baselayer values (3, 'google', 'hybrid'   , 'Google Hybrid'   , false, 20) ;
insert into baselayer values (4, 'google', 'streets'  , 'Google Streets'  , false, 20) ;

-- // url to retrieve base layers from geoserver
--   localhost/geoserver/wfs?request=GetFeature&version=1.1.0&typeName=opencop:baselayer&outputFormat=JSON


------------------------------------------------------------
---- layergroup

drop table layergroup;

create table layergroup (
  id integer primary key,
  name character varying(50),
  url character varying(300)
);

insert into layergroup values (0, 'All local layers', '/geoserver/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.1.1');
insert into layergroup values (1, 'topp only', '/geoserver/wms?request=getCapabilities&namespace=topp');

-- // url to retrieve base layers from geoserver
--   localhost/geoserver/wfs?request=GetFeature&version=1.1.0&typeName=opencop:layergroup&outputFormat=JSON
