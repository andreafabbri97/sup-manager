-- Migration: Ensure app_user table exists and pgcrypto extension available

-- Ensure pgcrypto for crypt/gen_random_uuid is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create app_user if it does not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_user') THEN
    CREATE TABLE app_user (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text UNIQUE,
      password_hash text,
      role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
      created_at timestamptz DEFAULT now(),
      last_login timestamptz
    );
    CREATE INDEX idx_app_user_role ON app_user(role);
  ELSE
    -- Ensure required columns exist
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS username text UNIQUE;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_login timestamptz;
    -- Ensure role CHECK allows admin/staff only
    ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
    ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('admin','staff'));
    CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user(role);
  END IF;
END$$;

-- Ensure sessions table exists
CREATE TABLE IF NOT EXISTS app_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '7 days')
);

-- End migration
