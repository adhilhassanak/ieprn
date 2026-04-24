-- 1. WhatsApp link on events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS whatsapp_link text;

-- 2. Add new enum values (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'documentation_head';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance_head';

-- 3. Feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_email text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_insert_authenticated" ON public.feedback;
CREATE POLICY "feedback_insert_authenticated"
ON public.feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "feedback_select_admin" ON public.feedback;
CREATE POLICY "feedback_select_admin"
ON public.feedback FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "feedback_delete_admin" ON public.feedback;
CREATE POLICY "feedback_delete_admin"
ON public.feedback FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Finance table (RLS policies added in part 2 once enum values are committed)
CREATE TABLE IF NOT EXISTS public.finance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL DEFAULT 0,
  note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;