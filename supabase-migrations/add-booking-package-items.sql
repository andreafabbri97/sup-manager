-- Add package_items column to booking table to store selected packages
ALTER TABLE booking ADD COLUMN IF NOT EXISTS package_items JSONB DEFAULT '[]'::jsonb;
