-- ============================================================
-- PROFILES: add community
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community text;

-- ============================================================
-- EVENTS: poster, pdf, coordinator_names, registration_open
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS poster_url text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS coordinator_names text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS registration_open boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.validate_event_coordinators()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.status = 'published' OR NEW.registration_open = true) THEN
    IF NEW.coordinator_names IS NULL OR array_length(NEW.coordinator_names, 1) IS NULL OR array_length(NEW.coordinator_names, 1) < 2 THEN
      RAISE EXCEPTION 'At least 2 coordinators are required to publish or open registrations for an event';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_event_coordinators ON public.events;
CREATE TRIGGER trg_validate_event_coordinators
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.validate_event_coordinators();

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.event_participants(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  participant_gmail text NOT NULL,
  present boolean NOT NULL DEFAULT true,
  marked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, participant_gmail)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POSITIONS NEEDED
-- ============================================================
CREATE TABLE IF NOT EXISTS public.positions_needed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community text NOT NULL,
  role_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.positions_needed ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ADMIN SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_color text NOT NULL DEFAULT '#2563eb',
  accent_color text NOT NULL DEFAULT '#f5c542',
  registration_open_global boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  singleton boolean NOT NULL DEFAULT true UNIQUE
);
INSERT INTO public.admin_settings (primary_color, accent_color, registration_open_global)
VALUES ('#2563eb', '#f5c542', true) ON CONFLICT DO NOTHING;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_approved_executive(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.registrations r ON r.user_id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = 'executive_member' AND r.status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_co_admin_of(_user_id uuid, _community text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = 'co_admin' AND p.community = _community
  )
$$;

-- ============================================================
-- ATTENDANCE POLICIES
-- ============================================================
DROP POLICY IF EXISTS attendance_select ON public.attendance;
CREATE POLICY attendance_select ON public.attendance FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = attendance.event_id
    AND (e.created_by = auth.uid() OR is_event_coordinator(e.id, auth.uid()) OR is_co_admin_of(auth.uid(), e.community)))
);
DROP POLICY IF EXISTS attendance_insert ON public.attendance;
CREATE POLICY attendance_insert ON public.attendance FOR INSERT TO authenticated
WITH CHECK (
  marked_by = auth.uid() AND (
    has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = attendance.event_id
      AND (e.created_by = auth.uid() OR is_event_coordinator(e.id, auth.uid()) OR is_co_admin_of(auth.uid(), e.community)))
  )
);
DROP POLICY IF EXISTS attendance_update ON public.attendance;
CREATE POLICY attendance_update ON public.attendance FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = attendance.event_id
    AND (e.created_by = auth.uid() OR is_event_coordinator(e.id, auth.uid()) OR is_co_admin_of(auth.uid(), e.community)))
);
DROP POLICY IF EXISTS attendance_delete ON public.attendance;
CREATE POLICY attendance_delete ON public.attendance FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- POSITIONS POLICIES
-- ============================================================
DROP POLICY IF EXISTS positions_select_public ON public.positions_needed;
CREATE POLICY positions_select_public ON public.positions_needed FOR SELECT TO anon, authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));
DROP POLICY IF EXISTS positions_insert ON public.positions_needed;
CREATE POLICY positions_insert ON public.positions_needed FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));
DROP POLICY IF EXISTS positions_update ON public.positions_needed;
CREATE POLICY positions_update ON public.positions_needed FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));
DROP POLICY IF EXISTS positions_delete ON public.positions_needed;
CREATE POLICY positions_delete ON public.positions_needed FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));

-- ============================================================
-- ADMIN SETTINGS POLICIES
-- ============================================================
DROP POLICY IF EXISTS settings_select_public ON public.admin_settings;
CREATE POLICY settings_select_public ON public.admin_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS settings_update_admin ON public.admin_settings;
CREATE POLICY settings_update_admin ON public.admin_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- REGISTRATIONS — add co_admin scope
-- ============================================================
DROP POLICY IF EXISTS reg_select_own_or_admin ON public.registrations;
CREATE POLICY reg_select_own_or_admin ON public.registrations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));
DROP POLICY IF EXISTS reg_update_admin ON public.registrations;
CREATE POLICY reg_update_admin ON public.registrations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));
DROP POLICY IF EXISTS reg_delete_admin ON public.registrations;
CREATE POLICY reg_delete_admin ON public.registrations FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));

-- ============================================================
-- EVENTS — gate creation, allow co_admin manage
-- ============================================================
DROP POLICY IF EXISTS events_insert ON public.events;
CREATE POLICY events_insert ON public.events FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    has_role(auth.uid(), 'admin')
    OR is_co_admin_of(auth.uid(), community)
    OR is_approved_executive(auth.uid())
  )
);
DROP POLICY IF EXISTS events_update ON public.events;
CREATE POLICY events_update ON public.events FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin')
  OR is_co_admin_of(auth.uid(), community) OR is_event_coordinator(id, auth.uid())
);
DROP POLICY IF EXISTS events_delete ON public.events;
CREATE POLICY events_delete ON public.events FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin') OR is_co_admin_of(auth.uid(), community));

-- ============================================================
-- EVENT_PARTICIPANTS — co_admin can see, registration must be open
-- ============================================================
DROP POLICY IF EXISTS participants_select ON public.event_participants;
CREATE POLICY participants_select ON public.event_participants FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_participants.event_id
    AND (e.created_by = auth.uid() OR has_role(auth.uid(), 'admin')
      OR is_event_coordinator(e.id, auth.uid()) OR is_co_admin_of(auth.uid(), e.community)))
);
DROP POLICY IF EXISTS participants_insert_anyone ON public.event_participants;
CREATE POLICY participants_insert_anyone ON public.event_participants FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_participants.event_id
    AND e.status = 'published' AND e.registration_open = true)
);

-- ============================================================
-- PROFILES — execom and co_admin can view in scope
-- ============================================================
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
  OR (community IS NOT NULL AND is_co_admin_of(auth.uid(), community))
  OR has_role(auth.uid(), 'executive_member')
);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-posters', 'event-posters', true, 512000, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 512000,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-pdfs', 'event-pdfs', true, 1048576, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 1048576,
  allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS "event posters public read" ON storage.objects;
CREATE POLICY "event posters public read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'event-posters');
DROP POLICY IF EXISTS "event posters upload" ON storage.objects;
CREATE POLICY "event posters upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-posters' AND (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin') OR is_approved_executive(auth.uid())
));
DROP POLICY IF EXISTS "event posters delete" ON storage.objects;
CREATE POLICY "event posters delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-posters' AND (
  auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin')
));

DROP POLICY IF EXISTS "event pdfs public read" ON storage.objects;
CREATE POLICY "event pdfs public read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'event-pdfs');
DROP POLICY IF EXISTS "event pdfs upload" ON storage.objects;
CREATE POLICY "event pdfs upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-pdfs' AND (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin') OR is_approved_executive(auth.uid())
));
DROP POLICY IF EXISTS "event pdfs delete" ON storage.objects;
CREATE POLICY "event pdfs delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-pdfs' AND (
  auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin')
));