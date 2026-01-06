-- Migration: Add manager role and open policies for managers (approve+payroll)

-- Allow manager role in app_user
ALTER TABLE app_user
  DROP CONSTRAINT IF EXISTS app_user_role_check;

ALTER TABLE app_user
  ADD CONSTRAINT IF NOT EXISTS app_user_role_check CHECK (role IN ('admin','manager','staff'));

-- Allow managers to create payroll runs (similar to admin)
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_runs_admin ON payroll_runs;
CREATE POLICY payroll_runs_admin_or_manager ON payroll_runs
  FOR ALL
  USING ((SELECT role FROM app_user WHERE id = auth.uid()) IN ('admin','manager'))
  WITH CHECK ((SELECT role FROM app_user WHERE id = auth.uid()) IN ('admin','manager'));

-- Update approve_shift RPC to allow managers as well
CREATE OR REPLACE FUNCTION approve_shift(p_shift_id uuid, p_action text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT role FROM app_user WHERE id = auth.uid()) NOT IN ('admin','manager') THEN
    RAISE EXCEPTION 'Only admin or manager may approve or reject shifts';
  END IF;

  IF p_action NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid action. Use approved or rejected';
  END IF;

  UPDATE shifts
  SET approval_status = p_action,
      approved_by = auth.uid(),
      approved_at = now(),
      approval_notes = p_note,
      updated_at = now()
  WHERE id = p_shift_id;
END;
$$;

-- End migration
