-- Migration: Add internal authentication support (username/password + sessions)

-- Add username and password_hash to app_user
ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Sessions table for internal sessions (tokens)
CREATE TABLE IF NOT EXISTS app_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '7 days')
);

-- Helper: get role by session token or auth.uid()
CREATE OR REPLACE FUNCTION app_user_role_for_session(p_session_token uuid DEFAULT NULL)
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

-- Helper: get user id by session token
CREATE OR REPLACE FUNCTION app_user_id_for_session(p_session_token uuid DEFAULT NULL)
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

-- RPC: authenticate_user(username, password) -> returns token uuid
CREATE OR REPLACE FUNCTION authenticate_user(p_username text, p_password text)
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

-- RPC: logout session
CREATE OR REPLACE FUNCTION logout_session(p_token uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM app_session WHERE token = p_token;
END;
$$;

-- RPC: get_current_user_role(p_token) -> text or NULL
CREATE OR REPLACE FUNCTION get_current_user_role(p_token uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN app_user_role_for_session(p_token);
END;
$$;

-- RPC: get_current_user_id(p_token) -> uuid
CREATE OR REPLACE FUNCTION get_current_user_id(p_token uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  RETURN app_user_id_for_session(p_token);
END;
$$;

-- RPC: create_internal_user(username, password, role)
-- Admin-only (checks current role via session token or auth.uid())
CREATE OR REPLACE FUNCTION create_internal_user(p_username text, p_password text, p_role text, p_session_token uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE new_id uuid;
BEGIN
  IF (app_user_role_for_session(p_session_token) <> 'admin') THEN
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

-- End migration
