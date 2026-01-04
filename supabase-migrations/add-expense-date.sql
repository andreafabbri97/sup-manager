-- Add date column to expense table so expenses can be filtered by date in reports
ALTER TABLE IF EXISTS expense
  ADD COLUMN IF NOT EXISTS date date DEFAULT now()::date;

-- Backfill existing rows with today's date if null
UPDATE expense SET date = now()::date WHERE date IS NULL;

-- End of migration
