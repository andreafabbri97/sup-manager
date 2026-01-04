-- Schema iniziale per Supabase (Postgres) — AUTH REMOVED (no user table)

create extension if not exists pgcrypto;

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

-- Equipment (general inventory for SUP, boats, paddles, lifejackets, etc.)
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  quantity integer DEFAULT 1,
  status text DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now()
);

