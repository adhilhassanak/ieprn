ALTER TABLE public.community_popups ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

GRANT SELECT ON public.community_popups TO anon;

DROP POLICY IF EXISTS "Anyone can view public popups" ON public.community_popups;
CREATE POLICY "Anyone can view public popups"
ON public.community_popups
FOR SELECT
TO anon, authenticated
USING (active = true AND is_public = true);

DROP FUNCTION IF EXISTS public.get_public_execom();

CREATE OR REPLACE FUNCTION public.get_public_execom()
 RETURNS TABLE(id uuid, full_name text, community text, photo_url text, current_position text, parent_head text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.full_name, r.community, r.photo_url, r.current_position, r.parent_head
  FROM public.registrations r
  JOIN public.user_roles ur ON ur.user_id = r.user_id AND ur.role = 'executive_member'
  WHERE r.status = 'approved'
  ORDER BY r.community, r.full_name;
$function$;