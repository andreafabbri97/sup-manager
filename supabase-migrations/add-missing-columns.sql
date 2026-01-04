-- Ensure required columns exist for bookings, equipment and expenses
-- Run this in Supabase SQL editor or via psql as the project owner

ALTER TABLE IF EXISTS sup
  ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES equipment(id);

ALTER TABLE IF EXISTS equipment
  ADD COLUMN IF NOT EXISTS price_per_hour numeric DEFAULT 0;

ALTER TABLE IF EXISTS booking
  ADD COLUMN IF NOT EXISTS equipment_items jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS package
  ADD COLUMN IF NOT EXISTS equipment_items jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS expense
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
ALTER TABLE IF EXISTS expense
  ADD COLUMN IF NOT EXISTS receipt_url text;

-- Optionally, ensure app_setting has iva_percent
-- Ensure `app_setting` table exists before inserting defaults
CREATE TABLE IF NOT EXISTS app_setting (
  key text PRIMARY KEY,
  value text
);

INSERT INTO app_setting(key, value)
  SELECT 'iva_percent', '22'
  WHERE NOT EXISTS (SELECT 1 FROM app_setting WHERE key = 'iva_percent');

-- End of migration
