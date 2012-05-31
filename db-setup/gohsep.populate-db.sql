insert into baselayer (id, brand, type, name, isdefault) values (0, 'yahoo' , ''         , 'Yahoo'           , false);
insert into baselayer (id, brand, type, name, isdefault) values (1, 'google', 'satellite', 'Google Satellite', false);
insert into baselayer (id, brand, type, name, isdefault) values (2, 'google', 'physical' , 'Google Physical' , true );
insert into baselayer (id, brand, type, name, isdefault) values (3, 'google', 'hybrid'   , 'Google Hybrid'   , false);
insert into baselayer (id, brand, type, name, isdefault) values (4, 'google', 'streets'  , 'Google Streets'  , false);

insert into layergroup (id, name, url) values (0, 'GOHSEP', '/geoserver/wms?request=getCapabilities');

-- insert into layer (id, layergroup, prefix, layers, name, type, url, abstract) values (0, 1, 'external', 'topp:example', 'our example WMS', 'WMS', '/geoserver/wms', 'Our favorite example layer', 20);

-- insert into iconstolayers (id, iconid, layer) values (1, 100, 'topp:example');

insert into config (id, component, name, value, description) values (0, 'db', 'domain', 'http://gocop.gohsep.la.gov', 'ex: "http://demo.geocent.com", "http://localhost". Sets href for edit_url-making rule.');
insert into config (id, component, name, value, description) values (1, 'map', 'refreshInterval', '300000', 'Layer refresh interval in ms.');
-- insert into config (id, component, name, value, description) values (2, 'map', 'adminEmail', 'opencop@geocent.com', 'Admin email');
