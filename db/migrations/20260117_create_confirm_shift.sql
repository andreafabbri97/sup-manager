-- Migration: Create or replace confirm_shift RPC (idempotent)

CREATE OR REPLACE FUNCTION public.confirm_shift(p_shift_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE shifts s
  SET status = 'completed', confirmed_by = auth.uid(), updated_at = now()
  WHERE s.id = p_shift_id
    AND EXISTS (SELECT 1 FROM employees e WHERE e.id = s.employee_id AND e.auth_user_id = auth.uid());
END;
$$;

-- Grant execute so authenticated users can call it via PostgREST/Supabase
GRANT EXECUTE ON FUNCTION public.confirm_shift(uuid) TO authenticated;

-- If you still see the schema cache error after running this migration in Supabase, refresh the API schema in the dashboard (Settings → Database → Refresh schema) or re-deploy the API schema cache.
