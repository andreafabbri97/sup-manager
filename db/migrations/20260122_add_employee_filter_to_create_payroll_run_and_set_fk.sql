-- Migration: Add p_employee_id to create_payroll_run and set payroll_items.shift_id FK to ON DELETE SET NULL

-- Update create_payroll_run to accept an optional employee filter and forward it to calculate_payroll
DROP FUNCTION IF EXISTS public.create_payroll_run(date, date, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.create_payroll_run(date, date, uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_payroll_run(
  p_start date,
  p_end date,
  p_created_by uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_employee_id uuid DEFAULT NULL
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

  -- Pass optional employee filter through to calculate_payroll
  payroll := calculate_payroll(p_start, p_end, p_employee_id);
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

GRANT EXECUTE ON FUNCTION public.create_payroll_run(date, date, uuid, text, text, uuid) TO anon, authenticated;

-- Adjust FK to avoid preventing shift deletion: set to NULL when a shift is deleted
ALTER TABLE payroll_items DROP CONSTRAINT IF EXISTS payroll_items_shift_id_fkey;
ALTER TABLE payroll_items ADD CONSTRAINT payroll_items_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;
