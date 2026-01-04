-- Add hourly price to equipment table
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS price_per_hour numeric DEFAULT 0;

COMMENT ON COLUMN equipment.price_per_hour IS 'Standard hourly rental price';
