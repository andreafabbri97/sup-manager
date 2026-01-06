-- Migration: Remove manager role and restore admin-only policies

-- Convert any existing manager roles to admin
UPDATE app_user SET role = 'admin' WHERE role = 'manager';

-- Replace role CHECK to only allow admin and staff
ALTER TABLE app_user
  DROP CONSTRAINT IF EXISTS app_user_role_check;

ALTER TABLE app_user
  ADD CONSTRAINT IF NOT EXISTS app_user_role_check CHECK (role IN ('admin','staff'));

-- Revert payroll_runs policy to admin-only
DROP POLICY IF EXISTS payroll_runs_admin_or_manager ON payroll_runs;
DROP POLICY IF EXISTS payroll_runs_admin ON payroll_runs;

CREATE POLICY payroll_runs_admin ON payroll_runs
  FOR ALL
  USING ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin');

-- Revert approve_shift RPC to admin-only
CREATE OR REPLACE FUNCTION approve_shift(p_shift_id uuid, p_action text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT role FROM app_user WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Only admin may approve or reject shifts';
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
