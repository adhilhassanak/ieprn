-- Default events to pending now that enum value is committed
ALTER TABLE public.events ALTER COLUMN status SET DEFAULT 'pending'::event_status;

-- Highlights
CREATE TABLE IF NOT EXISTS public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  community text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "highlights_select_public" ON public.highlights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "highlights_insert" ON public.highlights FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
);
CREATE POLICY "highlights_update" ON public.highlights FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
);
CREATE POLICY "highlights_delete" ON public.highlights FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
);

-- Event gallery
CREATE TABLE IF NOT EXISTS public.event_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_select_public" ON public.event_gallery FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "gallery_insert" ON public.event_gallery FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND (
      e.created_by = auth.uid() OR public.is_co_admin_of(auth.uid(), e.community) OR public.is_event_coordinator(e.id, auth.uid())
    )
  )
);
CREATE POLICY "gallery_delete" ON public.event_gallery FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.created_by = auth.uid() OR public.is_co_admin_of(auth.uid(), e.community))
  )
);

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'notice',
  community text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_select_public" ON public.announcements FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ann_insert" ON public.announcements FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
);
CREATE POLICY "ann_update" ON public.announcements FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
);
CREATE POLICY "ann_delete" ON public.announcements FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
);

-- Public ExeCom directory (no contact info)
CREATE OR REPLACE FUNCTION public.get_public_execom()
RETURNS TABLE (id uuid, full_name text, community text, photo_url text, current_position text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.full_name, r.community, r.photo_url, r.current_position
  FROM public.registrations r
  JOIN public.user_roles ur ON ur.user_id = r.user_id AND ur.role = 'executive_member'
  WHERE r.status = 'approved'
  ORDER BY r.community, r.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_execom() TO anon, authenticated;

-- Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('highlights', 'highlights', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('event-gallery', 'event-gallery', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "highlights_obj_read" ON storage.objects FOR SELECT USING (bucket_id = 'highlights');
CREATE POLICY "highlights_obj_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'highlights' AND (
    public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'co_admin')
  )
);
CREATE POLICY "highlights_obj_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'highlights' AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "gallery_obj_read" ON storage.objects FOR SELECT USING (bucket_id = 'event-gallery');
CREATE POLICY "gallery_obj_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'event-gallery' AND (
    public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('co_admin','executive_member'))
  )
);
CREATE POLICY "gallery_obj_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'event-gallery' AND public.has_role(auth.uid(), 'admin')
);

-- Publishing authority trigger
CREATE OR REPLACE FUNCTION public.enforce_event_publish_authority()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_co_admin_of(auth.uid(), NEW.community)) THEN
      RAISE EXCEPTION 'Only admin or community co-admin can publish events';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_publish ON public.events;
CREATE TRIGGER trg_enforce_publish BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.enforce_event_publish_authority();

DROP TRIGGER IF EXISTS trg_validate_coords ON public.events;
CREATE TRIGGER trg_validate_coords BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.validate_event_coordinators();