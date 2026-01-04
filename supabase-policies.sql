-- Abilita RLS e policy di base (NO AUTH: accesso pubblico a tutte le tabelle principali)

-- Abilita RLS sulle tabelle principali
ALTER TABLE IF EXISTS booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expense ENABLE ROW LEVEL SECURITY;

-- Public access for SUP and package
DROP POLICY IF EXISTS "Public access sup" ON sup;
CREATE POLICY "Public access sup" ON sup
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

DROP POLICY IF EXISTS "Public access package" ON package;
CREATE POLICY "Public access package" ON package
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- Public access for bookings and expenses (allow create/read/update/delete)
DROP POLICY IF EXISTS "Public access bookings" ON booking;
CREATE POLICY "Public access bookings" ON booking
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

DROP POLICY IF EXISTS "Public access expense" ON expense;
CREATE POLICY "Public access expense" ON expense
  FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- Note: Authentication and role checks removed. All tables are public for now.

