-- Add invoiced flag to booking so reports can consider VAT per booking
ALTER TABLE IF EXISTS booking
  ADD COLUMN IF NOT EXISTS invoiced boolean DEFAULT false;

ALTER TABLE IF EXISTS booking
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- Backfill existing rows to false (no-op since default applied)
UPDATE booking SET invoiced = false WHERE invoiced IS NULL;

-- End migration
