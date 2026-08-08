-- 1. coordinators: enable RLS, admin only
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coordinators TO authenticated;
GRANT ALL ON public.coordinators TO service_role;
REVOKE ALL ON public.coordinators FROM anon;
CREATE POLICY coordinators_admin_all ON public.coordinators FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. faculty: remove public read of contact details
DROP POLICY IF EXISTS faculty_public_read ON public.faculty;
CREATE POLICY faculty_admin_select ON public.faculty FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_public_faculty()
RETURNS TABLE(id uuid, name text, department text, designation text, photo_url text, priority integer, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT f.id, f.name, f.department, f.designation, f.photo_url, f.priority, f.active
  FROM public.faculty f
  WHERE f.active = true
  ORDER BY f.priority ASC, f.name ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_faculty() TO anon, authenticated;

-- 3. storage: scope broad write policies
DROP POLICY IF EXISTS "Faculty upload" ON storage.objects;
DROP POLICY IF EXISTS "Faculty update" ON storage.objects;
DROP POLICY IF EXISTS "Faculty delete" ON storage.objects;
CREATE POLICY "faculty images admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'faculty-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "faculty images admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'faculty-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'faculty-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "faculty images admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'faculty-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Faculty profile photos upload" ON storage.objects;
DROP POLICY IF EXISTS "Faculty profile photos update" ON storage.objects;
DROP POLICY IF EXISTS "Faculty profile photos delete" ON storage.objects;
CREATE POLICY "profile photos admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profile photos admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'profile-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profile photos admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND public.has_role(auth.uid(), 'admin'));