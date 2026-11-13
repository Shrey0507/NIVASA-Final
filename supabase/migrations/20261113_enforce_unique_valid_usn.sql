-- Enforce a normalized, non-empty, unique USN at the database boundary.
-- UUID student IDs remain in place as internal foreign keys to preserve all existing relations.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE usn IS NULL
       OR upper(btrim(usn)) !~ '^[A-Z0-9][A-Z0-9/-]{2,29}$'
  ) THEN
    RAISE EXCEPTION 'Cannot enforce USN validation: one or more existing student records have a missing or invalid USN. Correct those records first.';
  END IF;

  IF EXISTS (
    SELECT upper(btrim(usn))
    FROM public.students
    GROUP BY upper(btrim(usn))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce USN uniqueness: duplicate USNs exist after trimming and case normalization. Resolve duplicates first.';
  END IF;
END $$;

UPDATE public.students SET usn = upper(btrim(usn))
WHERE usn <> upper(btrim(usn));

ALTER TABLE public.students
  ALTER COLUMN usn SET NOT NULL;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_usn_format_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_usn_format_check
  CHECK (usn = upper(btrim(usn)) AND usn ~ '^[A-Z0-9][A-Z0-9/-]{2,29}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_usn_normalized
  ON public.students (upper(btrim(usn)));

NOTIFY pgrst, 'reload schema';
