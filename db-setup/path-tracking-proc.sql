-- This procedure works with two tables, one for lines and one for points.  It
-- generates points equally spaced across each line, based on speed and such.
--
-- Required fields:
--
-- Line
-- - fid         : id
-- - the_geom    : line-flavored geom
-- - knots       : float, speed
-- - hours_delta : int, distance between points
-- - start_time  : timestamp
--
-- Point
-- - the_geom    : point-flavored geom
-- - line_id     : link to layer
-- - time        : timestamp
CREATE or replace FUNCTION recalc_path_points() RETURNS TRIGGER AS $$
DECLARE
  i integer;
  --
  -- variables that come from the line table
  knots integer := NEW.knots;
  hours_delta integer := NEW.hours_delta;  -- distance between points
  start_time timestamp := NEW.start_time;
  --
  k integer := 1852;  -- multiply by knots to get meters per hour
  --
  meters_delta integer := hours_delta * knots * k;  -- distance between points
  total_meters float := ST_Length(ST_Transform(NEW.the_geom, 900913));
  point_count integer := floor(total_meters / meters_delta);
  percentage_delta float := 1.0 / point_count;  -- percentage of line between points
BEGIN
  -- RAISE NOTICE 'knots is %', knots;
  -- RAISE NOTICE 'hours_delta is %', hours_delta;
  -- RAISE NOTICE 'start_time is %', start_time;
  -- RAISE NOTICE 'meters_delta is %', meters_delta;
  -- RAISE NOTICE 'total_meters is %', total_meters;
  -- RAISE NOTICE 'point_count is %', point_count;
  -- RAISE NOTICE 'percentage_delta is %', percentage_delta;
  --
  -- delete existing points associated with this line
  delete from point_test where line_id = NEW.fid;
  --
  FOR i IN 0..point_count LOOP
    insert into point_test (line_id, the_geom, time) values (
      NEW.fid,
      ST_Line_Interpolate_Point(NEW.the_geom, i * percentage_delta),
      NEW.start_time + CAST(i * NEW.hours_delta || ' hours' as interval));
  END LOOP;
  --
  return NULL;
END;
$$ LANGUAGE plpgsql;

drop trigger recalc_path_points_trigger on line_test;
CREATE TRIGGER recalc_path_points_trigger
  AFTER INSERT OR UPDATE OR DELETE ON line_test
  FOR EACH ROW EXECUTE PROCEDURE recalc_path_points();

-- update line_test set hours_delta = 4;
-- select time from point_test;
