-- Add equipment_items to booking table
ALTER TABLE booking ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN booking.equipment_items IS 'Array of {id: equipment_id, quantity: number}';
