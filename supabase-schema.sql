-- Schema iniziale per Supabase (Postgres)

create extension if not exists pgcrypto;

-- Users
CREATE TABLE IF NOT EXISTS "user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text,
  name text,
  role text CHECK (role in ('owner','staff')) DEFAULT 'staff',
  created_at timestamptz DEFAULT now()
);

-- Username: enforce case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS user_username_idx ON "user" (lower(username));

-- Ensure column exists when applying to existing DB
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username text;
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

-- Bookings
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
  created_by uuid REFERENCES "user"(id),
  created_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expense (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  amount numeric,
  category text,
  notes text,
  created_by uuid REFERENCES "user"(id),
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
