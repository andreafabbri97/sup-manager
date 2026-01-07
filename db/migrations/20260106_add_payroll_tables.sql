-- Migration: Add payroll tables and functions

-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0.00,
  tax_id text,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shifts (turni)
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled|completed|cancelled
  recurrence text, -- simple recurrence descriptor (e.g., 'weekly:1' or 'monthly:15')
  confirmed_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- computed duration in hours
  duration_hours numeric GENERATED ALWAYS AS (extract(epoch from (end_at - start_at)) / 3600.0) STORED
);

CREATE INDEX IF NOT EXISTS idx_shifts_employee_start ON shifts(employee_id, start_at);

-- Payroll runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_by uuid,
  notes text,
  total_amount numeric(12,2),
  paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll Items (per employee / per shift)
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  shift_id uuid REFERENCES shifts(id),
  hours numeric(6,2) NOT NULL,
  rate numeric(10,2) NOT NULL,
  amount numeric(12,2) NOT NULL,
  expense_created boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Function: calculate_payroll(start_date,date, end_date,date, optional employee_id uuid)
-- Rounding rule: round duration to nearest whole hour using ROUND(); this implements your requested behavior
-- (e.g., 1.083h -> ROUND -> 1; 0.95h -> 1; 1.5 -> 2). If you want a different rule we can tweak.

CREATE OR REPLACE FUNCTION calculate_payroll(p_start date, p_end date, p_employee_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
  employee_rows jsonb := '[]'::jsonb;
  total_amount numeric := 0;
  total_hours numeric := 0;
BEGIN
  FOR rec IN
    SELECT s.id as shift_id, s.employee_id, e.name as employee_name, e.hourly_rate,
           s.start_at, s.end_at, s.duration_hours
    FROM shifts s
    JOIN employees e ON e.id = s.employee_id
    WHERE s.status = 'completed'
      AND (s.start_at::date >= p_start AND s.start_at::date <= p_end)
      AND (p_employee_id IS NULL OR s.employee_id = p_employee_id)
    ORDER BY s.employee_id
  LOOP
    -- apply rounding to nearest hour
    -- note: ROUND() returns numeric; cast to integer-like numeric for clarity
    DECLARE hours_paid numeric := ROUND(rec.duration_hours::numeric);
    DECLARE amount numeric := (hours_paid * rec.hourly_rate)::numeric(12,2);
    BEGIN
      employee_rows := employee_rows || jsonb_build_object(
        'shift_id', rec.shift_id,
        'employee_id', rec.employee_id,
        'employee_name', rec.employee_name,
        'start_at', rec.start_at,
        'end_at', rec.end_at,
        'duration_hours', rec.duration_hours,
        'hours_paid', hours_paid,
        'rate', rec.hourly_rate,
        'amount', amount
      );
      total_amount := total_amount + amount;
      total_hours := total_hours + hours_paid;
    END;
  END LOOP;

  -- Build per-employee aggregated totals for the selected period
  DECLARE emp_rec RECORD;
  DECLARE employee_aggregates jsonb := '[]'::jsonb;

  FOR emp_rec IN
    SELECT s.employee_id,
           e.name as employee_name,
           SUM(ROUND(s.duration_hours::numeric)) AS total_hours,
           SUM(ROUND(s.duration_hours::numeric) * e.hourly_rate)::numeric(12,2) AS total_amount
    FROM shifts s
    JOIN employees e ON e.id = s.employee_id
    WHERE s.status = 'completed'
      AND (s.start_at::date >= p_start AND s.start_at::date <= p_end)
      AND (p_employee_id IS NULL OR s.employee_id = p_employee_id)
    GROUP BY s.employee_id, e.name
    ORDER BY e.name
  LOOP
    employee_aggregates := employee_aggregates || jsonb_build_object(
      'employee_id', emp_rec.employee_id,
      'employee_name', emp_rec.employee_name,
      'total_hours', emp_rec.total_hours,
      'total_amount', emp_rec.total_amount
    );
  END LOOP;

  RETURN jsonb_build_object(
    'items', employee_rows,
    'totals', jsonb_build_object('total_hours', total_hours, 'total_amount', total_amount),
    'employees', employee_aggregates
  );
END;
$$;

-- Function: create_payroll_run(p_start date, p_end date, created_by uuid, notes text)
-- Uses calculate_payroll to build payroll_run and payroll_items
CREATE OR REPLACE FUNCTION create_payroll_run(p_start date, p_end date, p_created_by uuid, p_notes text DEFAULT NULL)
RETURNS TABLE (payroll_run_id uuid) LANGUAGE plpgsql AS $$
DECLARE
  payroll jsonb;
  row jsonb;
  run_id uuid;
BEGIN
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

-- Optional helper: create_expenses_from_payroll_run(run_id uuid)
-- This function creates expense rows (one per payroll_item) with description 'Paga {Name}, {Periodo}'
-- It depends on the existing `expense` table structure - adjust fields if necessary

-- Only create this function if an `expense` table exists with (amount numeric, date date, category text, notes text)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense') THEN
    CREATE OR REPLACE FUNCTION create_expenses_from_payroll_run(p_run_id uuid)
    RETURNS void LANGUAGE plpgsql AS $func$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT pi.id as item_id, pi.employee_id, e.name, pi.amount, pr.period_start, pr.period_end
        FROM payroll_items pi
        JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
        JOIN employees e ON e.id = pi.employee_id
        WHERE pi.payroll_run_id = p_run_id
      LOOP
        INSERT INTO expense (amount, date, category, notes)
        VALUES (r.amount, now()::date, 'Payroll', CONCAT('Paga ', r.name, ', ', to_char(r.period_start, 'Mon YYYY')));
      END LOOP;
    END;
    $func$;
  END IF;
END$$;

-- Notes:
-- - RLS policies should be added via Supabase console depending on your auth strategy
-- - Confirm this SQL before applying live; I can apply it if you provide service_role key or DB connection string
