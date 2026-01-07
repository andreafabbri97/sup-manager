-- Migration: Improve create_expenses_from_payroll_run to avoid duplicate expense creation and mark payroll_items.expense_created

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense') THEN
    CREATE OR REPLACE FUNCTION create_expenses_from_payroll_run(p_run_id uuid)
    RETURNS void LANGUAGE plpgsql AS $func$
    DECLARE r RECORD;
    DECLARE expense_id uuid;
    DECLARE distinct_count integer;
    BEGIN
      -- count distinct employees in this run so we can pick a friendly category
      distinct_count := (SELECT COUNT(DISTINCT employee_id) FROM payroll_items WHERE payroll_run_id = p_run_id);

      FOR r IN
        SELECT pi.id as item_id, pi.employee_id, e.name, pi.amount, pr.period_start, pr.period_end
        FROM payroll_items pi
        JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
        JOIN employees e ON e.id = pi.employee_id
        WHERE pi.payroll_run_id = p_run_id AND (pi.expense_created IS NULL OR pi.expense_created = false)
      LOOP
        INSERT INTO expense (amount, date, category, notes)
        VALUES (
          r.amount,
          now()::date,
          CASE WHEN distinct_count > 1 THEN 'Payroll globale' ELSE CONCAT('Payroll - ', r.name) END,
          CONCAT('Paga ', r.name, ', periodo ', to_char(r.period_start, 'DD/MM/YYYY'), ' - ', to_char(r.period_end, 'DD/MM/YYYY'))
        )
        RETURNING id INTO expense_id;

        UPDATE payroll_items SET expense_created = true WHERE id = r.item_id;
      END LOOP;
    END;
    $func$;
  END IF;
END$$;

-- End migration
