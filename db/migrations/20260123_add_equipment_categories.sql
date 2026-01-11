-- Migration: Add equipment categories table and seed defaults

CREATE TABLE IF NOT EXISTS equipment_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed sensible defaults if they don't exist
INSERT INTO equipment_category (name) SELECT v FROM (VALUES ('SUP'), ('Barca'), ('Remo'), ('Salvagente'), ('Altro')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM equipment_category WHERE name = v);
