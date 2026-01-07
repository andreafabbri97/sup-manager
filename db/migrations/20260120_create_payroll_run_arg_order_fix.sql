-- Migration: Replace create_payroll_run with a version that accepts parameters in either order (fix RPC param ordering issues)

-- Drop existing function (if present) so we can re-create with a stable parameter order that matches RPC callers
DROP FUNCTION IF EXISTS public.create_payroll_run(date, date, uuid, text);

CREATE OR REPLACE FUNCTION public.create_payroll_run(p_end date, p_start date, p_created_by uuid DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS TABLE (payroll_run_id uuid) LANGUAGE plpgsql AS $$
DECLARE
  payroll jsonb;
  row jsonb;
  run_id uuid;
BEGIN
  -- Note: parameters are named (p_end, p_start) in the signature to match callers that pass these names.
  -- Internally we call calculate_payroll using the logical start/end ordering.
  payroll := calculate_payroll(p_start, p_end);
  IF (coalesce((payroll->'totals'->>'total_amount')::numeric, 0) = 0) THEN
    RAISE NOTICE 'No payroll items found for period % - %', p_start, p_end;
  END IF;

  INSERT INTO payroll_runs (period_start, period_end, created_by, notes, total_amount)
  VALUES (p_start, p_end, p_created_by, p_notes, (payroll->'totals'->>'total_amount')::numeric)
  RETURNING id INTO run_id;

  FOR row IN SELECT * FROM jsonb_array_elements(payroll->'items') LOOP
    INSERT INTO payroll_items (payroll_run_id, employee_id, shift_id, hours, rate, amount)
    VALUES (
      run_id,
      (row->>'employee_id')::uuid,
      (row->>'shift_id')::uuid,
      (row->>'hours_paid')::numeric,
      (row->>'rate')::numeric,
      (row->>'amount')::numeric
    );
  END LOOP;

  RETURN QUERY SELECT run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_payroll_run(date, date, uuid, text) TO anon, authenticated;
