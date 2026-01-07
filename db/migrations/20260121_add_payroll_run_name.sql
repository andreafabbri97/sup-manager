-- Migration: Add `name` column to payroll_runs and update `create_payroll_run` to accept an optional p_name

ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS name text;

-- Drop any existing create_payroll_run overloads we might have to avoid parameter rename conflicts
DROP FUNCTION IF EXISTS public.create_payroll_run(date, date, uuid, text, text);
DROP FUNCTION IF EXISTS public.create_payroll_run(date, date, uuid, text);

CREATE OR REPLACE FUNCTION public.create_payroll_run(
  p_start date,
  p_end date,
  p_created_by uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_name text DEFAULT NULL
)
RETURNS TABLE (payroll_run_id uuid) LANGUAGE plpgsql AS $$
DECLARE
  payroll jsonb;
  row jsonb;
  run_id uuid;
  final_name text := p_name;
BEGIN
  -- If caller didn't provide a name, build a sensible default
  IF final_name IS NULL THEN
    final_name := format('Paga periodo dal %s al %s', p_start::text, p_end::text);
  END IF;

  payroll := calculate_payroll(p_start, p_end);
  IF (coalesce((payroll->'totals'->>'total_amount')::numeric, 0) = 0) THEN
    RAISE NOTICE 'No payroll items found for period % - %', p_start, p_end;
  END IF;

  INSERT INTO payroll_runs (period_start, period_end, created_by, notes, name, total_amount)
  VALUES (p_start, p_end, p_created_by, p_notes, final_name, (payroll->'totals'->>'total_amount')::numeric)
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

GRANT EXECUTE ON FUNCTION public.create_payroll_run(date, date, uuid, text, text) TO anon, authenticated;
