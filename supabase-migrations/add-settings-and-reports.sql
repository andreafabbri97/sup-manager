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
  SELECT name, SUM(bookings_count) AS bookings_count, SUM(revenue) AS revenue FROM (
    -- Packages
    SELECT p.name AS name, COUNT(b.id) AS bookings_count, COALESCE(SUM(b.price),0) AS revenue
    FROM booking b
    LEFT JOIN package p ON p.id = b.package_id
    WHERE b.start_time::date BETWEEN start_date AND end_date AND b.package_id IS NOT NULL
    GROUP BY p.name

    UNION ALL

    -- Equipment (expand equipment_items JSONB)
    SELECT COALESCE(eq.name, '—') AS name,
           COUNT(b.id) AS bookings_count,
           COALESCE(SUM( COALESCE(eq.price_per_hour,0) * ((ei->>'quantity')::int) * (EXTRACT(EPOCH FROM (b.end_time - b.start_time))/3600) ),0) AS revenue
    FROM booking b
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(b.equipment_items, '[]'::jsonb)) AS ei
    LEFT JOIN equipment eq ON eq.id = (ei->>'id')::uuid
    WHERE b.start_time::date BETWEEN start_date AND end_date AND (ei->>'id') IS NOT NULL
    GROUP BY eq.name
  ) t
  GROUP BY name
  ORDER BY SUM(bookings_count) DESC
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
