-- Migration: Update confirm_shift to accept optional session token and use app_user_id_for_session

CREATE OR REPLACE FUNCTION public.confirm_shift(p_shift_id uuid, p_session_token uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid;
BEGIN
  uid := public.app_user_id_for_session(p_session_token);

  -- Update only if the caller is the owner (matches employees.auth_user_id) or if uid is null, fallback to auth.uid() via helper
  UPDATE shifts s
  SET status = 'completed', confirmed_by = uid, updated_at = now()
  WHERE s.id = p_shift_id
    AND EXISTS (SELECT 1 FROM employees e WHERE e.id = s.employee_id AND e.auth_user_id = uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_shift(uuid, uuid) TO authenticated;
