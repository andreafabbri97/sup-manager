-- ATTENZIONE: SCRIPT DISTRUTTIVO
-- Questo script cancellerà tutti i dati nel progetto (DROP SCHEMA public CASCADE)
-- Esegui SOLO se sei sicuro di voler resettare il database.

-- DROP and recreate public schema (destroys all tables and data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Extensions
create extension if not exists pgcrypto;

-- Recreate schema (copiato da supabase-schema.sql)

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

-- Policies (copiato da supabase-policies.sql)

-- Abilita RLS sulle tabelle principali
ALTER TABLE IF EXISTS "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expense ENABLE ROW LEVEL SECURITY;

-- Policy: utenti autenticati possono inserire il proprio profilo (id = auth.uid())
-- Nota: non permettiamo agli utenti di auto-assegnarsi il ruolo 'owner' durante insert/update
CREATE POLICY "Allow insert own user profile" ON "user"
  FOR INSERT
  WITH CHECK ( auth.uid() = id AND (role IS NULL OR role = 'staff') );

CREATE POLICY "Allow select own user profile" ON "user"
  FOR SELECT
  USING ( auth.uid() = id );

-- Policy: utenti autenticati possono aggiornare il proprio profilo, ma non possono promuoversi a owner
CREATE POLICY "Allow update own user profile" ON "user"
  FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id AND (role IS NULL OR role = 'staff') );

-- Owners possono gestire la tabella user (incluse promozioni/demozioni)
CREATE POLICY "Owners can manage users" ON "user"
  FOR ALL
  USING ( EXISTS (SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role = 'owner') )
  WITH CHECK ( EXISTS (SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role = 'owner') );

-- Owners can manage bookings
CREATE POLICY "Owners can manage bookings" ON booking
  FOR ALL
  USING ( EXISTS (SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role = 'owner') )
  WITH CHECK ( EXISTS (SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role = 'owner') );

-- Policy: staff/owners possono leggere bookings
CREATE POLICY "Authenticated can read bookings" ON booking
  FOR SELECT
  USING ( auth.uid() IS NOT NULL );

-- Policy: users can create bookings (created_by will be user's id)
CREATE POLICY "Owners or staff can create bookings" ON booking
  FOR INSERT
  WITH CHECK ( created_by = auth.uid() );

-- Similar policies for expenses (owner can manage all; authenticated can create expense)
CREATE POLICY "Authenticated can insert expense" ON expense
  FOR INSERT
  WITH CHECK ( auth.uid() IS NOT NULL );

CREATE POLICY "Owners can manage expense" ON expense
  FOR ALL
  USING ( EXISTS (SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role = 'owner') )
  WITH CHECK ( EXISTS (SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role = 'owner') );

-- Public read for SUP and packages (any authenticated user can read)
CREATE POLICY "Public select sup" ON sup
  FOR SELECT
  USING ( true );

CREATE POLICY "Public select package" ON package
  FOR SELECT
  USING ( true );

-- End of reset
