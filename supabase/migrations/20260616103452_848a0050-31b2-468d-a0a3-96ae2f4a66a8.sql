
-- 1) community_logos table
CREATE TABLE IF NOT EXISTS public.community_logos (
  community text PRIMARY KEY,
  logo_url text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_logos TO anon, authenticated;
GRANT ALL ON public.community_logos TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.community_logos TO authenticated;

ALTER TABLE public.community_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_logos_read_all" ON public.community_logos;
CREATE POLICY "community_logos_read_all" ON public.community_logos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_logos_admin_insert" ON public.community_logos;
CREATE POLICY "community_logos_admin_insert" ON public.community_logos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "community_logos_admin_update" ON public.community_logos;
CREATE POLICY "community_logos_admin_update" ON public.community_logos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "community_logos_admin_delete" ON public.community_logos;
CREATE POLICY "community_logos_admin_delete" ON public.community_logos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_community_logos_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS community_logos_touch ON public.community_logos;
CREATE TRIGGER community_logos_touch BEFORE UPDATE ON public.community_logos
  FOR EACH ROW EXECUTE FUNCTION public.touch_community_logos_updated_at();

-- 2) Manual registered count override on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS manual_registered_count integer;

-- 3) RLS for storage.objects bucket community-logos
DROP POLICY IF EXISTS "community-logos public read" ON storage.objects;
CREATE POLICY "community-logos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-logos');

DROP POLICY IF EXISTS "community-logos admin write" ON storage.objects;
CREATE POLICY "community-logos admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "community-logos admin update" ON storage.objects;
CREATE POLICY "community-logos admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'community-logos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'community-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "community-logos admin delete" ON storage.objects;
CREATE POLICY "community-logos admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'community-logos' AND public.has_role(auth.uid(), 'admin'));
