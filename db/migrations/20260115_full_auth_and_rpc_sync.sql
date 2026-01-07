-- Migration: Full sync for internal auth RPCs, tables and permissions
-- Idempotent: can be run multiple times safely

-- Ensure pgcrypto available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure app_user table exists with required columns
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
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS username text UNIQUE;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_login timestamptz;
    ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
    ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('admin','staff'));
    CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user(role);
  END IF;
END$$;

-- Ensure app_session table exists
CREATE TABLE IF NOT EXISTS app_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '7 days')
);

-- Drop and recreate helper functions in public schema (safe)
DROP FUNCTION IF EXISTS public.app_user_role_for_session(uuid);
CREATE OR REPLACE FUNCTION public.app_user_role_for_session(p_session_token uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  uid uuid;
  r text;
BEGIN
  IF p_session_token IS NOT NULL THEN
    SELECT user_id INTO uid FROM app_session WHERE token = p_session_token AND expires_at > now() LIMIT 1;
    IF uid IS NOT NULL THEN
      SELECT role INTO r FROM app_user WHERE id = uid LIMIT 1;
      RETURN r;
    END IF;
  END IF;

  SELECT role INTO r FROM app_user WHERE id = auth.uid();
  RETURN r;
END;
$$;

DROP FUNCTION IF EXISTS public.app_user_id_for_session(uuid);
CREATE OR REPLACE FUNCTION public.app_user_id_for_session(p_session_token uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  IF p_session_token IS NOT NULL THEN
    SELECT user_id INTO uid FROM app_session WHERE token = p_session_token AND expires_at > now() LIMIT 1;
    IF uid IS NOT NULL THEN RETURN uid; END IF;
  END IF;
  RETURN auth.uid();
END;
$$;

-- Drop and recreate main RPCs (ensure signature and behavior)
DROP FUNCTION IF EXISTS public.authenticate_user(text, text);
CREATE OR REPLACE FUNCTION public.authenticate_user(p_password text, p_username text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE u RECORD; t uuid;
BEGIN
  SELECT * INTO u FROM app_user WHERE username = p_username LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  IF u.password_hash IS NULL OR crypt(p_password, u.password_hash) <> u.password_hash THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  INSERT INTO app_session (user_id) VALUES (u.id) RETURNING token INTO t;
  UPDATE app_user SET last_login = now() WHERE id = u.id;
  RETURN t;
END;
$$;

-- Logout
DROP FUNCTION IF EXISTS public.logout_session(uuid);
CREATE OR REPLACE FUNCTION public.logout_session(p_token uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM app_session WHERE token = p_token;
END;
$$;

-- get_current_user_role/id
DROP FUNCTION IF EXISTS public.get_current_user_role(uuid);
CREATE OR REPLACE FUNCTION public.get_current_user_role(p_token uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN public.app_user_role_for_session(p_token);
END;
$$;

DROP FUNCTION IF EXISTS public.get_current_user_id(uuid);
CREATE OR REPLACE FUNCTION public.get_current_user_id(p_token uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  RETURN public.app_user_id_for_session(p_token);
END;
$$;

-- create_internal_user (admin-only)
DROP FUNCTION IF EXISTS public.create_internal_user(text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.create_internal_user(p_username text, p_password text, p_role text, p_session_token uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE new_id uuid;
BEGIN
  IF (public.app_user_role_for_session(p_session_token) <> 'admin') THEN
    RAISE EXCEPTION 'Only admin may create users';
  END IF;

  IF p_role NOT IN ('admin','staff') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  new_id := gen_random_uuid();
  INSERT INTO app_user (id, username, password_hash, role) VALUES (new_id, p_username, crypt(p_password, gen_salt('bf')), p_role);
  RETURN new_id;
END;
$$;

-- Optional: create_expenses_from_payroll_run if expense table exists (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense') THEN
    CREATE OR REPLACE FUNCTION public.create_expenses_from_payroll_run(p_run_id uuid)
    RETURNS void LANGUAGE plpgsql AS $func$
    DECLARE r RECORD; expense_id uuid;
    BEGIN
      FOR r IN
        SELECT pi.employee_id, e.name, SUM(pi.amount) AS total_amount, SUM(pi.hours) AS total_hours, pr.period_start, pr.period_end
        FROM payroll_items pi
        JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
        JOIN employees e ON e.id = pi.employee_id
        WHERE pi.payroll_run_id = p_run_id AND (pi.expense_created IS NULL OR pi.expense_created = false)
        GROUP BY pi.employee_id, e.name, pr.period_start, pr.period_end
      LOOP
        INSERT INTO expense (amount, date, category, notes)
        VALUES (r.total_amount, now()::date, CONCAT('Payroll - ', r.name), CONCAT('Paga ', r.name, ', periodo ', to_char(r.period_start, 'DD/MM/YYYY'), ' - ', to_char(r.period_end, 'DD/MM/YYYY'), ' (', regexp_replace(r.total_hours::text, '\\.?0+$', ''), ' ore)'))
        RETURNING id INTO expense_id;

        UPDATE payroll_items SET expense_created = true WHERE payroll_run_id = p_run_id AND employee_id = r.employee_id;
      END LOOP;
    END;
    $func$;
  END IF;
END$$;

-- Grants: allow anon & authenticated to execute RPCs (so PostgREST exposes them)
GRANT EXECUTE ON FUNCTION public.get_current_user_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_user(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.logout_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_internal_user(text, text, text, uuid) TO anon, authenticated;

-- Bootstrap admin if none exists (username 'admin' / password 'admin123')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_user WHERE role = 'admin') THEN
    INSERT INTO app_user (username, password_hash, role) VALUES ('admin', crypt('admin123', gen_salt('bf')), 'admin');
  END IF;
END$$;

-- End migration
