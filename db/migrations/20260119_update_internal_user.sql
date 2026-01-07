-- Migration: Add update_internal_user RPC to allow admins to update username/password/role

CREATE OR REPLACE FUNCTION public.update_internal_user(
  p_user_id uuid,
  p_username text DEFAULT NULL,
  p_password text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_session_token uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF (app_user_role_for_session(p_session_token) <> 'admin') THEN
    RAISE EXCEPTION 'Only admin may update users';
  END IF;

  IF p_role IS NOT NULL AND p_role NOT IN ('admin','staff') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF p_username IS NOT NULL THEN
    UPDATE app_user SET username = p_username WHERE id = p_user_id;
  END IF;

  IF p_password IS NOT NULL THEN
    UPDATE app_user SET password_hash = crypt(p_password, gen_salt('bf')) WHERE id = p_user_id;
  END IF;

  IF p_role IS NOT NULL THEN
    UPDATE app_user SET role = p_role WHERE id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_internal_user(uuid, text, text, text, uuid) TO anon, authenticated;
