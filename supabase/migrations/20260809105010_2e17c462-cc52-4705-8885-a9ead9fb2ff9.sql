ALTER TABLE public.activity_calendar ADD COLUMN IF NOT EXISTS volunteers text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.community_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  media_url text,
  media_type text NOT NULL DEFAULT 'none',
  visible_to text[] NOT NULL DEFAULT '{}'::text[],
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_popups TO authenticated;
GRANT ALL ON public.community_popups TO service_role;

ALTER TABLE public.community_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage popups"
ON public.community_popups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved execom can view popups for their communities"
ON public.community_popups FOR SELECT TO authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.user_id = auth.uid()
      AND r.status = 'approved'
      AND r.community = ANY (community_popups.visible_to)
  )
);

CREATE TRIGGER trg_touch_community_popups
BEFORE UPDATE ON public.community_popups
FOR EACH ROW EXECUTE FUNCTION public.touch_activity_calendar_updated_at();