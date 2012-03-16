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

drop table if exists baselayer;
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

drop table if exists layergroup cascade;
create table layergroup (
  id integer primary key,
  name character varying(50),
  url character varying(300)
);

insert into layergroup values (0, 'All local layers', '/geoserver/wms?request=getCapabilities');
insert into layergroup values (1, 'topp only', '/geoserver/wms?request=getCapabilities&namespace=topp');
insert into layergroup values (2, 'empty', '/geoserver/wms?request=getCapabilities&namespace=empty');

-- // url to retrieve base layers from geoserver
--   localhost/geoserver/wfs?request=GetFeature&version=1.1.0&typeName=opencop:layergroup&outputFormat=JSON


------------------------------------------------------------
---- layer

drop table if exists layer;
create table layer (
  id integer primary key,
  layergroup integer references layergroup,
  prefix character varying(15),
  layers character varying(50),
  name character varying(50),
  type character varying(20),
  url character varying(200),
  abstract character varying(500),
  numzoomlevels integer
);

insert into layer values (0, 1, 'external', 'topp:example', 'our example WMS', 'WMS', '/geoserver/wms', 'Our favorite example layer', 20);
insert into layer values (1, 2, 'external', 'basic', 'some WMS test', 'WMS', 'http://vmap0.tiles.osgeo.org/wms/vmap0', 'Try this WMS; you will find you like it.', 20);
insert into layer values (2, 2, 'external', 'neplo', 'some KML test', 'KML', 'http://demo.geocent.com/neplo/neplo.kml', 'A really very nice KML layer.', 20);
insert into layer values (3, 2, 'external', 'neplo', 'some KML test', 'KML', 'http://demo.geocent.com/opencop-icons/kml/Installations.kml', 'Golden test', 20);

------------------------------------------------------------
---- icons to layers

drop table if exists iconstolayers;
create table iconstolayers (
  id integer primary key,
  iconid integer references icon,
  layer character varying(100)  -- defined as namespace:name
);

insert into iconstolayers values (1, 100, 'topp:example');
insert into iconstolayers values (2, 200, 'topp:example');
insert into iconstolayers values (3, 300, 'topp:example');
insert into iconstolayers values (4, 400, 'topp:example');
insert into iconstolayers values (5, 500, 'topp:taz_shapes');
insert into iconstolayers values (6, 600, 'topp:taz_shapes');
insert into iconstolayers values (7, 700, 'topp:taz_shapes');
insert into iconstolayers values (8, 800, 'topp:example');


------------------------------------------------------------
---- iconmaster (view)

drop view if exists iconmaster;
create view iconmaster as
  select
    i.id,
    i.name,
    i.url,
    s.layer
  from
    icon as i,
    iconstolayers as s
  where i.id = s.iconid;


------------------------------------------------------------
---- config

drop table if exists config;
create table config (
  id integer primary key,
  component varchar(30),
  name varchar(50),
  value varchar(200),
  description varchar(200)
);

insert into config values (0, 'db', 'domain', 'http://demo.geocent.com', 'ex: "http://demo.geocent.com", "http://localhost". Sets href for edit_url-making rule.');
