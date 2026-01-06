-- Migration: Fix authenticate_user RPC parameter order so Supabase schema cache finds it

-- Recreate authenticate_user with parameter order (p_password, p_username)
CREATE OR REPLACE FUNCTION authenticate_user(p_password text, p_username text)
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

-- End migration
