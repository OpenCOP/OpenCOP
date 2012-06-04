insert into baselayer (id, brand, type, name, isdefault) values (0, 'yahoo' , ''         , 'Yahoo'           , false);
insert into baselayer (id, brand, type, name, isdefault) values (1, 'google', 'satellite', 'Google Satellite', false);
insert into baselayer (id, brand, type, name, isdefault) values (2, 'google', 'physical' , 'Google Physical' , true );
insert into baselayer (id, brand, type, name, isdefault) values (3, 'google', 'hybrid'   , 'Google Hybrid'   , false);
insert into baselayer (id, brand, type, name, isdefault) values (4, 'google', 'streets'  , 'Google Streets'  , false);

insert into layergroup (id, name, url) values (0, 'All local layers', '/geoserver/wms?request=getCapabilities');
insert into layergroup (id, name, url) values (1, 'topp only', '/geoserver/wms?request=getCapabilities&namespace=topp');
insert into layergroup (id, name, url) values (2, 'empty', '/geoserver/wms?request=getCapabilities&namespace=empty');

insert into layer (id, layergroup, prefix, layers, name, type, url, abstract) values (0, 1, 'external', 'topp:example', 'our example WMS', 'WMS', '/geoserver/wms', 'Our favorite example layer', 20);
insert into layer (id, layergroup, prefix, layers, name, type, url, abstract) values (1, 2, 'external', 'basic', 'some WMS test', 'WMS', 'http://vmap0.tiles.osgeo.org/wms/vmap0', 'Try this WMS; you will find you like it.', 20);
insert into layer (id, layergroup, prefix, layers, name, type, url, abstract) values (2, 2, 'external', 'neplo', 'some KML test', 'KML', 'http://demo.geocent.com/neplo/neplo.kml', 'A really very nice KML layer.', 20);
insert into layer (id, layergroup, prefix, layers, name, type, url, abstract) values (3, 2, 'external', 'neplo', 'some KML test', 'KML', 'http://demo.geocent.com/opencop-icons/kml/Installations.kml', 'Golden test', 20);

insert into iconstolayers (id, iconid, layer) values (0, 100, 'topp:example');
insert into iconstolayers (id, iconid, layer) values (1, 200, 'topp:example');
insert into iconstolayers (id, iconid, layer) values (2, 300, 'topp:example');
insert into iconstolayers (id, iconid, layer) values (3, 400, 'topp:example');
insert into iconstolayers (id, iconid, layer) values (4, 500, 'topp:taz_shapes');
insert into iconstolayers (id, iconid, layer) values (5, 600, 'topp:taz_shapes');
insert into iconstolayers (id, iconid, layer) values (6, 700, 'topp:taz_shapes');
insert into iconstolayers (id, iconid, layer) values (7, 800, 'topp:example');

insert into config (id, component, name, value, description) values (0, 'db', 'domain', 'https://publicdemo.geocent.com', 'ex: "http://demo.geocent.com", "http://localhost". Sets href for edit_url-making rule.');
insert into config (id, component, name, value, description) values (1, 'map', 'refreshInterval', '120000', 'Layer refresh interval in ms.');
insert into config (id, component, name, value, description) values (2, 'map', 'adminEmail', 'opencop@geocent.com', 'Admin email');

insert into default_layer (id, type, name, url, layers) values (0, 'WMS', 'Water Temp', 'http://geo-dev.geocent.com/geoserver/netcdf/wms?service=WMS', 'netcdf:water_temp');
insert into default_layer (id, type, name, url, layers) values (1, 'WMS', 'parish', 'http://localhost:80/geoserver/ows?SERVICE=WMS', 'topp:parish');
insert into default_layer (id, type, name, url, layers) values (2, 'KML', 'some KML test', 'http://demo.geocent.com/opencop-icons/kml/Installations.kml', null);
