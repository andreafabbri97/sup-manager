-- Migration: Ensure employees.auth_user_id exists

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- Helpful index for lookups by auth_user_id
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);

-- End migration
