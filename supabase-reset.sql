-- ATTENZIONE: SCRIPT DISTRUTTIVO
-- Questo script cancellerà tutti i dati nel progetto (DROP SCHEMA public CASCADE)
-- Esegui SOLO se sei sicuro di voler resettare il database.

-- DROP and recreate public schema (destroys all tables and data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Extensions
create extension if not exists pgcrypto;

-- Recreate schema (AUTH REMOVED)

-- SUP
CREATE TABLE IF NOT EXISTS sup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  status text DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);

-- Packages
CREATE TABLE IF NOT EXISTS package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  description text,
  price numeric,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

-- Bookings (no user references)
CREATE TABLE IF NOT EXISTS booking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sup_id uuid REFERENCES sup(id),
  package_id uuid REFERENCES package(id),
  customer_name text,
  customer_contact text,
  start_time timestamptz,
  end_time timestamptz,
  price numeric,
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

-- Expenses (no user references)
CREATE TABLE IF NOT EXISTS expense (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  amount numeric,
  category text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Customers (opzionale)
CREATE TABLE IF NOT EXISTS customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  contact text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Equipment
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  quantity integer DEFAULT 1,
  status text DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Policies: public access for main tables
ALTER TABLE IF EXISTS booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access sup" ON sup
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

CREATE POLICY "Public access package" ON package
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

CREATE POLICY "Public access bookings" ON booking
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

CREATE POLICY "Public access expense" ON expense
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

CREATE POLICY "Public access equipment" ON equipment
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- Reports functions (monthly income)
CREATE OR REPLACE FUNCTION report_monthly_income()
RETURNS TABLE(month text, revenue numeric)
LANGUAGE sql
AS $$
  SELECT to_char(date_trunc('month', start_time), 'YYYY-MM') AS month,
         COALESCE(SUM(price), 0) AS revenue
  FROM booking
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

-- Add links between sup and equipment to enable equipment-level reporting
ALTER TABLE IF EXISTS sup ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES equipment(id);

-- Allow storing receipt url on expenses
ALTER TABLE IF EXISTS expense ADD COLUMN IF NOT EXISTS receipt_url text;

-- App settings for global configuration (e.g. IVA percent)
CREATE TABLE IF NOT EXISTS app_setting (
  key text PRIMARY KEY,
  value text
);

INSERT INTO app_setting(key, value)
  SELECT 'iva_percent', '22'
  WHERE NOT EXISTS (SELECT 1 FROM app_setting WHERE key = 'iva_percent');

-- Top products (by bookings)
CREATE OR REPLACE FUNCTION report_top_products(start_date date, end_date date, limit int DEFAULT 10)
RETURNS TABLE(name text, bookings_count int, revenue numeric)
LANGUAGE sql
AS $$
  SELECT p.name AS name, COUNT(b.id) AS bookings_count, COALESCE(SUM(b.price),0) AS revenue
  FROM booking b
  LEFT JOIN package p ON p.id = b.package_id
  WHERE b.start_time::date BETWEEN start_date AND end_date
  GROUP BY 1
  ORDER BY bookings_count DESC
  LIMIT limit;
$$;

-- Counts (bookings)
CREATE OR REPLACE FUNCTION report_counts(start_date date, end_date date)
RETURNS TABLE(metric text, value int)
LANGUAGE sql
AS $$
  SELECT 'bookings' AS metric, (SELECT COUNT(*) FROM booking WHERE start_time::date BETWEEN start_date AND end_date) AS value
$$;

-- Reports: revenue by equipment and margin
CREATE OR REPLACE FUNCTION report_revenue_by_equipment(start_date date, end_date date)
RETURNS TABLE(equipment text, bookings_count int, revenue numeric)
LANGUAGE sql
AS $$
  SELECT COALESCE(eq.name, s.name) AS equipment,
         COUNT(b.id) AS bookings_count,
         COALESCE(SUM(b.price), 0) AS revenue
  FROM booking b
  LEFT JOIN sup s on s.id = b.sup_id
  LEFT JOIN equipment eq on eq.id = s.equipment_id
  WHERE b.start_time::date BETWEEN start_date AND end_date
  GROUP BY 1
  ORDER BY revenue DESC;
$$;

CREATE OR REPLACE FUNCTION report_margin(start_date date, end_date date)
RETURNS TABLE(metric text, value numeric)
LANGUAGE sql
AS $$
  WITH rev AS (
    SELECT COALESCE(SUM(price),0) AS revenue
    FROM booking
    WHERE start_time::date BETWEEN start_date AND end_date
  ),
  exp AS (
    SELECT COALESCE(SUM(amount),0) AS expenses
    FROM expense
    WHERE date BETWEEN start_date AND end_date
  )
  SELECT 'revenue'::text AS metric, (SELECT revenue FROM rev) AS value
  UNION ALL
  SELECT 'expenses'::text, (SELECT expenses FROM exp)
  UNION ALL
  SELECT 'margin'::text, (SELECT revenue - expenses FROM rev, exp);
$$;

CREATE OR REPLACE FUNCTION report_daily_revenue(start_date date, end_date date)
RETURNS TABLE(day date, revenue numeric)
LANGUAGE sql
AS $$
  SELECT day::date AS day, COALESCE(SUM(b.price),0) AS revenue
  FROM generate_series(start_date, end_date, '1 day'::interval) AS day
  LEFT JOIN booking b ON b.start_time::date = day::date
  GROUP BY day
  ORDER BY day;
$$;

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

-- Grants: ensure anon/authenticated clients can use the public schema and tables
-- This fixes "permission denied for schema public" when using client anon keys
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- Sanity check suggestion: after running this script, from SQL Editor try:
--   SELECT current_user, has_table_privilege(current_user, 'public.sup', 'select');
-- to verify privileges for the connected role.

-- End of reset
