-- Abilita RLS e policy di base

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
-- Policy: owners (definiti nella tabella "user") possono gestire tutto
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

-- Public access for SUP and package (no auth)
DROP POLICY IF EXISTS "Public select sup" ON sup;
CREATE POLICY "Public access sup" ON sup
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

DROP POLICY IF EXISTS "Public select package" ON package;
CREATE POLICY "Public access package" ON package
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- Public access for bookings and expenses (allow create/read/delete for now)
DROP POLICY IF EXISTS "Owners can manage bookings" ON booking;
DROP POLICY IF EXISTS "Authenticated can read bookings" ON booking;
DROP POLICY IF EXISTS "Owners or staff can create bookings" ON booking;

CREATE POLICY "Public access bookings" ON booking
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

DROP POLICY IF EXISTS "Authenticated can insert expense" ON expense;
DROP POLICY IF EXISTS "Owners can manage expense" ON expense;
CREATE POLICY "Public access expense" ON expense
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- Users: allow inserts/select but prevent clients from setting role='owner'
DROP POLICY IF EXISTS "Allow insert own user profile" ON "user";
DROP POLICY IF EXISTS "Allow select own user profile" ON "user";
DROP POLICY IF EXISTS "Allow update own user profile" ON "user";
DROP POLICY IF EXISTS "Owners can manage users" ON "user";

CREATE POLICY "Public insert user" ON "user"
  FOR INSERT
  WITH CHECK ( role IS NULL OR role = 'staff' );

CREATE POLICY "Public select user" ON "user"
  FOR SELECT
  USING ( true );

CREATE POLICY "Public update user" ON "user"
  FOR UPDATE
  USING ( true )
  WITH CHECK ( role IS NULL OR role = 'staff' );

/*
Note: after running these policies, we recommend using Supabase Studio to set your user row's role to 'owner' for the primary account(s):
  update "user" set role='owner' where id='<your-auth-uid>';
*/
