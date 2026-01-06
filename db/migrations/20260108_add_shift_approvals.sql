-- Migration: Add approval workflow to shifts

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_notes text;

-- Admin-only update policy already exists; ensure approvals are covered by admin update policy
-- Add RPC to approve/reject shift by admin

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