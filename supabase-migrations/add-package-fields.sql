-- Add duration and equipment_items to package table
ALTER TABLE package ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE package ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN package.duration IS 'Duration in minutes';
COMMENT ON COLUMN package.equipment_items IS 'Array of {id: equipment_id, quantity: number}';
