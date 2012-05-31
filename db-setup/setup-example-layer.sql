-- geocent office locations

create table example (
  id serial primary key,
  name varchar(80),
  building varchar(80),
  address varchar(80),
  city varchar(20),
  state varchar(2),
  zip integer,
  tollfree varchar(20),
  phone varchar(20),
  fax varchar(20),
  the_geom geometry,
  edit_url varchar(255),
  description varchar(255),
  version bigint
);

insert into example (id, name, building, address, city, state, zip, tollfree, phone, fax, the_geom, edit_url, description, version) values (0, 'Corporate Headquarters', '', '111 Veterans Memorial Blvd, Suite 1600', 'Metairie', 'LA', 70005, '1-800-218-9009', '504-831-1900', '504-831-1901', ST_GeometryFromText('POINT(-90.132713 30.001762)', 4326), '<a href="http://geo-dev.geocent.com/geoserver/wfs?request=GetFeature&version=1.0.0&outputFormat=editor&typeName=sandbox:example&FEATUREID=0" target="_blank" style="color:red;">Edit</a>', '', 0);
insert into example (id, name, building, address, city, state, zip, tollfree, phone, fax, the_geom, edit_url, description, version) values (1, 'Charleston, SC Office', 'Lowcountry Innovation Center', '1535 Hobby Street, Suite 103', 'North Charleston', 'SC', 29405, '', 'Office: 843-405-5151', 'Fax: 843-405-5150', ST_GeometryFromText('POINT(-79.9311 32.7764)', 4326), '<a href="http://geo-dev.geocent.com/geoserver/wfs?request=GetFeature&version=1.0.0&outputFormat=editor&typeName=sandbox:example&FEATUREID=1" target="_blank" style="color:red;">Edit</a>', '', 0);
insert into example (id, name, building, address, city, state, zip, tollfree, phone, fax, the_geom, edit_url, description, version) values (2, 'UNO Research & Technology Park Offices', '', '2219 Lakeshore Drive, Building 1, Suite 300', 'New Orleans', 'LA', 70122, '1-800-218-9009', '504-831-1900', '504-613-5871', ST_GeometryFromText('POINT(-90.073556 30.031466)', 4326), '<a href="http://geo-dev.geocent.com/geoserver/wfs?request=GetFeature&version=1.0.0&outputFormat=editor&typeName=sandbox:example&FEATUREID=2" target="_blank" style="color:red;">Edit</a>', '', 0);
insert into example (id, name, building, address, city, state, zip, tollfree, phone, fax, the_geom, edit_url, description, version) values (3, 'Stennis Space Center Office', '', 'C Road, Building 1103, Suite 249', 'Stennis Space Center', 'MS', 39529, '', '228-688-3309', '228-688-6531', ST_GeometryFromText('POINT(-89.6002 30.3628)', 4326), '<a href="http://geo-dev.geocent.com/geoserver/wfs?request=GetFeature&version=1.0.0&outputFormat=editor&typeName=sandbox:example&FEATUREID=3" target="_blank" style="color:red;">Edit</a>', '', 0);
insert into example (id, name, building, address, city, state, zip, tollfree, phone, fax, the_geom, edit_url, description, version) values (4, 'Baton Rouge, LA Office', '', '5615 Corporate Blvd, Suite 500B', 'Baton Rouge', 'LA', 70808, '1-800-218-9009', '', '', ST_GeometryFromText('POINT(-91.131869 30.424391)', 4326), '<a href="http://geo-dev.geocent.com/geoserver/wfs?request=GetFeature&version=1.0.0&outputFormat=editor&typeName=sandbox:example&FEATUREID=4" target="_blank" style="color:red;">Edit</a>', '', 0);
insert into example (id, name, building, address, city, state, zip, tollfree, phone, fax, the_geom, edit_url, description, version) values (5, 'Huntsville, AL Office', '', '4717 University Drive NW, Suite 96', 'Huntsville', 'AL', 35816, '', '256-489-4748', '256-489-4586', ST_GeometryFromText('POINT(-86.647965 34.735950)', 4326), '<a href="http://geo-dev.geocent.com/geoserver/wfs?request=GetFeature&version=1.0.0&outputFormat=editor&typeName=sandbox:example&FEATUREID=5" target="_blank" style="color:red;">Edit</a>', '', 0);
