CREATE TABLE public.custom_communities (
  key text PRIMARY KEY,
  name text NOT NULL,
  short text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT 'emerald',
  instagram text,
  facebook text,
  linkedin text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_communities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.custom_communities TO authenticated;
GRANT ALL ON public.custom_communities TO service_role;
ALTER TABLE public.custom_communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view communities" ON public.custom_communities FOR SELECT USING (true);
CREATE POLICY "Admins manage communities" ON public.custom_communities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));