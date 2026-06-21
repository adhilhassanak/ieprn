
CREATE OR REPLACE FUNCTION public.get_user_community(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT community FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE TABLE public.activity_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community text NOT NULL,
  event_name text NOT NULL,
  event_date date NOT NULL,
  coordinator_name text NOT NULL,
  coordinator_phone text NOT NULL,
  visible_to text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_calendar TO authenticated;
GRANT ALL ON public.activity_calendar TO service_role;

ALTER TABLE public.activity_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_select"
ON public.activity_calendar FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_co_admin_of(auth.uid(), community)
  OR public.get_user_community(auth.uid()) = community
  OR public.get_user_community(auth.uid()) = ANY(visible_to)
);

CREATE POLICY "calendar_insert"
ON public.activity_calendar FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_co_admin_of(auth.uid(), community)
);

CREATE POLICY "calendar_update"
ON public.activity_calendar FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_co_admin_of(auth.uid(), community)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_co_admin_of(auth.uid(), community)
);

CREATE POLICY "calendar_delete"
ON public.activity_calendar FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_co_admin_of(auth.uid(), community)
);

CREATE OR REPLACE FUNCTION public.touch_activity_calendar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_touch_activity_calendar
BEFORE UPDATE ON public.activity_calendar
FOR EACH ROW EXECUTE FUNCTION public.touch_activity_calendar_updated_at();

CREATE INDEX idx_activity_calendar_community ON public.activity_calendar(community);
CREATE INDEX idx_activity_calendar_date ON public.activity_calendar(event_date);
