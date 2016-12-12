call ogr2ogr -f "PostgreSQL" PG:"host=localhost port=5432 dbname=bag user=postgres" 3dGebouwhoogteNL.gml Gebouw -nln bagactueel.pandhoogtes -overwrite -progress -skipfailures --config PG_USE_COPY YES
