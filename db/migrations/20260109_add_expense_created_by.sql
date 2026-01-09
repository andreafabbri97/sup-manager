-- Migration: add created_by to expense
ALTER TABLE expense
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES app_user(id);

-- Optional: if you want to backfill with a system user, add SQL here.
