
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'dark'
  CHECK (theme_mode IN ('light','dark'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS coordinator_contacts jsonb NOT NULL DEFAULT '[]'::jsonb;
