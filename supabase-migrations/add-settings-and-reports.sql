-- Safe migration: add app_setting table and reporting functions

-- App settings for global configuration (e.g. IVA percent)
CREATE TABLE IF NOT EXISTS app_setting (
  key text PRIMARY KEY,
  value text
);

INSERT INTO app_setting(key, value)
  SELECT 'iva_percent', '22'
  WHERE NOT EXISTS (SELECT 1 FROM app_setting WHERE key = 'iva_percent');

-- Top products (by bookings)
CREATE OR REPLACE FUNCTION report_top_products(start_date date, end_date date, p_limit int DEFAULT 10)
RETURNS TABLE(name text, bookings_count int, revenue numeric)
LANGUAGE sql
AS $$
  SELECT p.name AS name, COUNT(b.id) AS bookings_count, COALESCE(SUM(b.price),0) AS revenue
  FROM booking b
  LEFT JOIN package p ON p.id = b.package_id
  WHERE b.start_time::date BETWEEN start_date AND end_date
  GROUP BY 1
  ORDER BY bookings_count DESC
  LIMIT p_limit;
$$;

-- Counts (bookings)
CREATE OR REPLACE FUNCTION report_counts(start_date date, end_date date)
RETURNS TABLE(metric text, value int)
LANGUAGE sql
AS $$
  SELECT 'bookings' AS metric, (SELECT COUNT(*) FROM booking WHERE start_time::date BETWEEN start_date AND end_date) AS value
$$;

-- Daily orders (count of bookings per day)
CREATE OR REPLACE FUNCTION report_daily_orders(start_date date, end_date date)
RETURNS TABLE(day date, orders int)
LANGUAGE sql
AS $$
  SELECT day::date AS day, COALESCE(COUNT(b.id),0) AS orders
  FROM generate_series(start_date, end_date, '1 day'::interval) AS day
  LEFT JOIN booking b ON b.start_time::date = day::date
  GROUP BY day
  ORDER BY day;
$$;
