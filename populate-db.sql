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
  zoomlevelcount integer
);

insert into baselayers values (0, 'google', 'streets', 'Google Streets', true, 22);
insert into baselayers values (1, 'google', 'physical', 'Google Physical', false, 22);
insert into baselayers values (2, 'google', 'hybrid', 'Google Hybrid', false, 22);
insert into baselayers values (3, 'google', 'satellite', 'Google Satellite', false, 22);

-- url to retrieve base layers from geoserver
--   localhost/geoserver/wfs?request=GetFeature&version=1.1.0&typeName=opencop:baselayers&outputFormat=JSON
