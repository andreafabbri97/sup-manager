-- Migration: Add wrapper for create_payroll_run accepting parameters in reverse order to handle RPC parameter ordering issues

CREATE OR REPLACE FUNCTION public.create_payroll_run(p_end date, p_start date, p_created_by uuid DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS TABLE (payroll_run_id uuid) LANGUAGE plpgsql AS $$
BEGIN
  -- Delegate to the main implementation which expects (p_start, p_end, p_created_by, p_notes)
  RETURN QUERY SELECT * FROM create_payroll_run(p_start := p_start, p_end := p_end, p_created_by := p_created_by, p_notes := p_notes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_payroll_run(date, date, uuid, text) TO anon, authenticated;
