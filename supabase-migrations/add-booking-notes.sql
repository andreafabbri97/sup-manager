-- Add notes column to booking so notes can be stored and edited from UI
ALTER TABLE booking ADD COLUMN IF NOT EXISTS notes text;
COMMENT ON COLUMN booking.notes IS 'Note libere associate alla prenotazione';
