-- Add photo_url to profiles for reuse across registrations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Per-community registration toggles stored as JSONB map (keys: community short names like 'IIC','E-Cell','ED Club')
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS community_registration jsonb NOT NULL DEFAULT '{"IIC":true,"E-Cell":true,"ED Club":true}'::jsonb;

-- Position seat limits
ALTER TABLE public.positions_needed
  ADD COLUMN IF NOT EXISTS max_count integer NOT NULL DEFAULT 1;