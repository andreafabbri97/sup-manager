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

-- Grants: ensure anon/authenticated clients can use the public schema and tables
-- This fixes "permission denied for schema public" when using client anon keys
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- Sanity check suggestion: after running this script, from SQL Editor try:
--   SELECT current_user, has_table_privilege(current_user, 'public.sup', 'select');
-- to verify privileges for the connected role.

-- End of reset
