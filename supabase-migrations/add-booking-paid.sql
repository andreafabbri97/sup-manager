-- Add paid flag and timestamp to bookings
ALTER TABLE IF EXISTS booking
  ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false;

ALTER TABLE IF EXISTS booking
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- End of migration
