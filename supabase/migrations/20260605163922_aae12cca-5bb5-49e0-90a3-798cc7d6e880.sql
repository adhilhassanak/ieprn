
-- 1. Tighten announcements INSERT
DROP POLICY IF EXISTS ann_insert ON public.announcements;
CREATE POLICY ann_insert ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
  );

-- 2. dashboard_links RLS
ALTER TABLE public.dashboard_links ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.dashboard_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dashboard_links TO authenticated;
GRANT ALL ON public.dashboard_links TO service_role;
DROP POLICY IF EXISTS dashboard_links_select ON public.dashboard_links;
DROP POLICY IF EXISTS dashboard_links_admin_write ON public.dashboard_links;
CREATE POLICY dashboard_links_select ON public.dashboard_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY dashboard_links_admin_write ON public.dashboard_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. notices RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
DROP POLICY IF EXISTS notices_select ON public.notices;
DROP POLICY IF EXISTS notices_admin_write ON public.notices;
CREATE POLICY notices_select ON public.notices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY notices_admin_write ON public.notices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. event_participants: add user_id and self-access policies
ALTER TABLE public.event_participants ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON public.event_participants(user_id);

DROP POLICY IF EXISTS participants_select ON public.event_participants;
CREATE POLICY participants_select ON public.event_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_participants.event_id
        AND (
          e.created_by = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.is_event_coordinator(e.id, auth.uid())
          OR public.is_co_admin_of(auth.uid(), e.community)
        )
    )
  );

DROP POLICY IF EXISTS participants_insert_anyone ON public.event_participants;
CREATE POLICY participants_insert_anyone ON public.event_participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL OR user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_participants.event_id
        AND e.status = 'published'
        AND e.registration_open = true
    )
  );

DROP POLICY IF EXISTS participants_delete_self_or_admin ON public.event_participants;
CREATE POLICY participants_delete_self_or_admin ON public.event_participants
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 5. profiles: remove executive_member broad read
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (community IS NOT NULL AND public.is_co_admin_of(auth.uid(), community))
  );

-- 6. user_roles: restrict select
DROP POLICY IF EXISTS roles_select_all ON public.user_roles;
CREATE POLICY roles_select_own_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 7. execom_sorted view → security invoker
ALTER VIEW public.execom_sorted SET (security_invoker = true);
