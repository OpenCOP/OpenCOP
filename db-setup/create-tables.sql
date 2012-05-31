------------------------------------------------------------
-- Create the tables for the database,
-- only if they don't already exist.


------------------------------------------------------------
---- icon

CREATE TABLE icon (
    id bigint primary key,
    name character varying(255),
    url text
);


------------------------------------------------------------
---- base layers

create table baselayer (
  id serial primary key,
  brand character varying(20),
  type character varying(20),
  name character varying(100),
  isdefault boolean,
);

-- // url to retrieve base layers from geoserver
--   localhost/geoserver/wfs?request=GetFeature&version=1.1.0&typeName=opencop:baselayer&outputFormat=JSON


------------------------------------------------------------
---- layergroup

create table layergroup (
  id serial primary key,
  name character varying(50),
  url character varying(300)
);

-- // url to retrieve base layers from geoserver
--   localhost/geoserver/wfs?request=GetFeature&version=1.1.0&typeName=opencop:layergroup&outputFormat=JSON


------------------------------------------------------------
---- layer

create table layer (
  id serial primary key,
  layergroup integer references layergroup,
  prefix character varying(15),
  layers character varying(50),
  name character varying(50),
  type character varying(20),
  url character varying(200),
  abstract character varying(500)
);


------------------------------------------------------------
---- icons to layers

create table iconstolayers (
  id serial primary key,
  iconid integer references icon,
  layer character varying(100)  -- defined as namespace:name
);


------------------------------------------------------------
---- iconmaster (view)

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

create table config (
  id serial primary key,
  component varchar(30),
  name varchar(50),
  value varchar(200),
  description varchar(200)
);


------------------------------------------------------------
---- default layers

-- These are layers that appear by default -- on a per installation
-- basis -- under the layer tree on startup.

create table default_layer (
  id SERIAL primary key,
  type varchar(6),    -- "WMS" or "KML"
  name varchar(200),  -- what user sees in layer tree
  url text,           -- url to service [1]
  layers text         -- generally, the namespace:layer that geoserver uses [2]
);
-- [1]: optionally, could specify filters
--      example: http://geo-dev.geocent.com/geoserver/netcdf/wms?service=WMS
-- [2]: optionally, could specify multiple layers
