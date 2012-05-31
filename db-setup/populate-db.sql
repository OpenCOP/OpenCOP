insert into baselayer (id, brand, type, name, isdefault) values (0, 'yahoo' , ''         , 'Yahoo'           , false) ;
insert into baselayer (id, brand, type, name, isdefault) values (1, 'google', 'satellite', 'Google Satellite', false) ;
insert into baselayer (id, brand, type, name, isdefault) values (2, 'google', 'physical' , 'Google Physical' , true ) ;
insert into baselayer (id, brand, type, name, isdefault) values (3, 'google', 'hybrid'   , 'Google Hybrid'   , false) ;
insert into baselayer (id, brand, type, name, isdefault) values (4, 'google', 'streets'  , 'Google Streets'  , false) ;

insert into layergroup (id, name, url) values (0, 'sandbox', '/geoserver/wms?request=getCapabilities&namespace=sandbox');

insert into layer (id, layergroup, prefix, layers, name, type, url, abstract) values (0, 1, 'sandbox', 'sandbox:example', 'example', 'WMS', '/geoserver/wms', 'Example WMS layer');

insert into default_layer (id, type, name, url, layers) values (0, 'WMS', 'example', 'http://localhost/geoserver/sandbox/wms?service=WMS', 'sandbox:example');
-- insert into default_layer (id, type, name, url, layers) values (2, 'KML', 'some KML test', 'http://demo.geocent.com/opencop-icons/kml/Installations.kml', null);

insert into iconstolayers (id, iconid, layer) values (0, 100, 'sandbox:example');

insert into config (id, component, name, value, description) values (0, 'db', 'domain', 'http://localhost', 'ex: "http://demo.geocent.com", "http://localhost". Sets href for edit_url-making rule.');
insert into config (id, component, name, value, description) values (1, 'map', 'refreshInterval', '120000', 'Layer refresh interval in ms.');
insert into config (id, component, name, value, description) values (2, 'map', 'adminEmail', 'opencop@geocent.com', 'Admin email');
insert into config (id, component, name, value, description) values (3, 'security', 'showLogin', 'true', 'Whether or not to show the login on startup.');
insert into config (id, component, name, value, description) values (4, 'map', 'showLayers', 'true', 'Whether or not to show the layer picker on startup.');
