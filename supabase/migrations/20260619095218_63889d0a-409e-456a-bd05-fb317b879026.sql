
-- =========================================================
-- 1) SECURITY FIXES
-- =========================================================

-- 1a) event_participants: require authenticated user, tie row to auth.uid()
DROP POLICY IF EXISTS participants_insert_anyone ON public.event_participants;
CREATE POLICY participants_insert_authenticated
  ON public.event_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_participants.event_id
        AND e.status = 'published'
        AND e.registration_open = true
    )
  );

-- 1b) event_coordinators: only admins may assign coordinators
DROP POLICY IF EXISTS coord_insert_creator_or_admin ON public.event_coordinators;
DROP POLICY IF EXISTS coord_delete_creator_or_admin ON public.event_coordinators;

CREATE POLICY coord_insert_admin_only
  ON public.event_coordinators
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY coord_delete_admin_only
  ON public.event_coordinators
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 1c) Remove duplicate community_logos policies (keep canonical ones)
DROP POLICY IF EXISTS "Anyone can view logos" ON public.community_logos;
DROP POLICY IF EXISTS "Only admins can delete logos" ON public.community_logos;
DROP POLICY IF EXISTS "Only admins can insert logos" ON public.community_logos;
DROP POLICY IF EXISTS "Only admins can update logos" ON public.community_logos;

-- 1d) Fix function search_path on the three remaining functions
CREATE OR REPLACE FUNCTION public.touch_community_logos_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_community_logo_timestamp()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_registration_counts()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE total_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM public.event_registrations
  WHERE event_id = COALESCE(NEW.event_id, OLD.event_id);
  UPDATE public.events
    SET actual_registrations = total_count,
        displayed_registrations = total_count
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  RETURN NULL;
END;
$$;

-- =========================================================
-- 2) THEME TOKENS — extend admin_settings
-- =========================================================
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '#1e3a8a',
  ADD COLUMN IF NOT EXISTS button_color    text NOT NULL DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS gradient_from   text NOT NULL DEFAULT '#1d4ed8',
  ADD COLUMN IF NOT EXISTS gradient_to     text NOT NULL DEFAULT '#f5c542';

-- =========================================================
-- 3) FACULTY TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  designation text,
  email text,
  phone text,
  photo_url text,
  priority int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faculty TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty TO authenticated;
GRANT ALL ON public.faculty TO service_role;

ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

CREATE POLICY faculty_public_read   ON public.faculty FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY faculty_admin_insert  ON public.faculty FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY faculty_admin_update  ON public.faculty FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY faculty_admin_delete  ON public.faculty FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_faculty_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_faculty_updated_at ON public.faculty;
CREATE TRIGGER trg_faculty_updated_at BEFORE UPDATE ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION public.touch_faculty_updated_at();

-- =========================================================
-- 4) PRINCIPAL TABLE (single record enforced by app, no constraint)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.principal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  designation text,
  email text,
  phone text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.principal TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.principal TO authenticated;
GRANT ALL ON public.principal TO service_role;

ALTER TABLE public.principal ENABLE ROW LEVEL SECURITY;

CREATE POLICY principal_public_read  ON public.principal FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY principal_admin_insert ON public.principal FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY principal_admin_update ON public.principal FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY principal_admin_delete ON public.principal FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_principal_updated_at ON public.principal;
CREATE TRIGGER trg_principal_updated_at BEFORE UPDATE ON public.principal
  FOR EACH ROW EXECUTE FUNCTION public.touch_faculty_updated_at();
