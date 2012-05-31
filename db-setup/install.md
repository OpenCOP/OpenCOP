create necessary databases and users

  $ createdb -U postgres opencop
  $ createuser -U postgres opencop
  $ psql -U opencop opencop
  eoc=# \password
  eoc=# \q
  $ ./populate-db  ; runs this script

point geoserver to the new layers

  make opencop workspace

    name      : opencop
    namespace : http://opencop.geocent.com

  make opencop postgis store

  publish all tables as layers
