---- description

-- given that these exist:
--   - opencop database
--   - opencop user
--
-- destroy, recreate, and populate the tables in the opencop database

---- base layers

drop table baselayers;

create table baselayers (
  id integer primary key,
  brand character varying(20),
  type character varying(20),
  name character varying(100),
  isdefault boolean,
  numzoomlevels integer
);

insert into baselayers values (0, 'yahoo' , ''         , 'Yahoo'           , false, 0)  ; -- zoom level not used
insert into baselayers values (1, 'google', 'satellite', 'Google Satellite', false, 22) ;
insert into baselayers values (2, 'google', 'physical' , 'Google Physical' , true , 22) ; -- zoom level not confirmed
insert into baselayers values (3, 'google', 'streets'  , 'Google Streets'  , false, 20) ;
-- // google hybrid is the default layer, and doesn't need to be defined in the database
-- insert into baselayers values (1, 'google', 'hybrid'   , 'Google Hybrid'   , false, 20);

-- // url to retrieve base layers from geoserver
--   localhost/geoserver/wfs?request=GetFeature&version=1.1.0&typeName=opencop:baselayers&outputFormat=JSON
