-- Migration: Add app_user table, auth link and RLS policies for payroll

-- Add auth_user_id to employees so we can map auth users to employee records
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- Simple app_user table to store role for authenticated users
CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user(role);

-- Enable RLS and add policies
-- Employees: admin can manage; staff can select their own record
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_select_admin_or_owner ON employees
  FOR SELECT
  USING (
    (SELECT role FROM app_user WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = auth_user_id
  );

CREATE POLICY employees_admin_manage ON employees
  FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin');

-- Shifts: admin sees all; staff sees only their shifts; inserts allowed for admin or owner (own employee_id)
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY shifts_select_admin_or_owner ON shifts
  FOR SELECT
  USING (
    (SELECT role FROM app_user WHERE id = auth.uid()) = 'admin'
    OR EXISTS (SELECT 1 FROM employees e WHERE e.id = shifts.employee_id AND e.auth_user_id = auth.uid())
  );

CREATE POLICY shifts_insert_admin_or_owner ON shifts
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM app_user WHERE id = auth.uid()) = 'admin'
    OR EXISTS (SELECT 1 FROM employees e WHERE e.id = new.employee_id AND e.auth_user_id = auth.uid())
  );

-- Restrict updates/deletes to admin for now
CREATE POLICY shifts_update_admin ON shifts
  FOR UPDATE
  USING ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin');

CREATE POLICY shifts_delete_admin ON shifts
  FOR DELETE
  USING ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin');

-- Payroll runs: admin only
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_runs_admin ON payroll_runs
  FOR ALL
  USING ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin');

-- Payroll items: admin sees all; staff sees only their items
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_items_select_admin_or_owner ON payroll_items
  FOR SELECT
  USING (
    (SELECT role FROM app_user WHERE id = auth.uid()) = 'admin'
    OR EXISTS (SELECT 1 FROM employees e WHERE e.id = payroll_items.employee_id AND e.auth_user_id = auth.uid())
  );

CREATE POLICY payroll_items_admin_manage ON payroll_items
  FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM app_user WHERE id = auth.uid()) = 'admin');

-- RPC: allow staff to confirm their shift via a server-side function (checks ownership)
CREATE OR REPLACE FUNCTION confirm_shift(p_shift_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE shifts s
  SET status = 'completed', confirmed_by = auth.uid(), updated_at = now()
  WHERE s.id = p_shift_id
    AND EXISTS (SELECT 1 FROM employees e WHERE e.id = s.employee_id AND e.auth_user_id = auth.uid());
END;
$$;

-- Note: Granting execute on RPC is handled by Supabase; ensure authenticated users can call this RPC.
-- You may want to populate `app_user` rows mapping auth user ids to 'admin' for admin users.
-- End migration
