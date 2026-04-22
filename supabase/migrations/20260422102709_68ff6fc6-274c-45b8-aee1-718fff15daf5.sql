ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS semester text;
UPDATE public.registrations SET semester = COALESCE(semester, current_semester, next_semester);
ALTER TABLE public.registrations DROP COLUMN IF EXISTS current_semester;
ALTER TABLE public.registrations DROP COLUMN IF EXISTS next_semester;