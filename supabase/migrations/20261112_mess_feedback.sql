-- NIVASA meal feedback
CREATE TABLE IF NOT EXISTS public.mess_feedback (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 meal TEXT NOT NULL CHECK (meal IN ('Breakfast','Lunch','Evening snacks','Dinner')),
 menu_day TEXT NOT NULL CHECK (menu_day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
 rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
 comment TEXT CHECK (comment IS NULL OR char_length(comment)<=1000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mess_feedback_created_at ON public.mess_feedback(created_at DESC);
ALTER TABLE public.mess_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mess_feedback_student_insert" ON public.mess_feedback;
DROP POLICY IF EXISTS "mess_feedback_student_read" ON public.mess_feedback;
CREATE POLICY "mess_feedback_student_insert" ON public.mess_feedback FOR INSERT TO authenticated WITH CHECK(student_id=public.current_student_id());
CREATE POLICY "mess_feedback_student_read" ON public.mess_feedback FOR SELECT TO authenticated USING(student_id=public.current_student_id());
GRANT SELECT,INSERT ON public.mess_feedback TO authenticated;
GRANT ALL ON public.mess_feedback TO service_role;
NOTIFY pgrst,'reload schema';