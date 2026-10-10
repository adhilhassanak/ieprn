CREATE OR REPLACE FUNCTION public.list_approved_execom()
RETURNS TABLE(user_id uuid, full_name text, community text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (r.user_id) r.user_id, r.full_name::text, r.community::text
  FROM public.registrations r
  WHERE r.status = 'approved' AND auth.uid() IS NOT NULL
  ORDER BY r.user_id, r.created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.list_approved_execom() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_event_coordinator(_event_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin') OR is_approved_executive(auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = _event_id AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'Only the event creator can assign coordinators';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM registrations WHERE user_id = _user_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Coordinator must be an approved ExeCom member';
  END IF;
  INSERT INTO event_coordinators(event_id, user_id) SELECT _event_id, _user_id
    WHERE NOT EXISTS (SELECT 1 FROM event_coordinators WHERE event_id = _event_id AND user_id = _user_id);
  INSERT INTO user_roles(user_id, role) VALUES (_user_id, 'coordinator') ON CONFLICT DO NOTHING;
END $$;
GRANT EXECUTE ON FUNCTION public.assign_event_coordinator(uuid, uuid) TO authenticated;

CREATE TABLE public.ai_assistant_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  instructions text NOT NULL DEFAULT '',
  request_templates text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_assistant_settings TO authenticated;
GRANT ALL ON public.ai_assistant_settings TO service_role;
ALTER TABLE public.ai_assistant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai settings read" ON public.ai_assistant_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai settings admin insert" ON public.ai_assistant_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "ai settings admin update" ON public.ai_assistant_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
INSERT INTO public.ai_assistant_settings(id) VALUES (1);