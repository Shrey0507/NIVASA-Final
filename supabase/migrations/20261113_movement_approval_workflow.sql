-- Add explicit review metadata for student movement approval workflow.
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID;
CREATE INDEX IF NOT EXISTS idx_movements_expected_return_pending
  ON public.movements(expected_return_time)
  WHERE status IN ('pending','approved','out');
NOTIFY pgrst, 'reload schema';
