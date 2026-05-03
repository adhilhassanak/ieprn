-- Hierarchy linking
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS parent_head text;

-- Event registration mode + whatsapp group
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS external_form_url text,
  ADD COLUMN IF NOT EXISTS registration_mode text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS whatsapp_group_link text;

-- Allow approved exec members to see other approved members (incl. contacts)
DROP POLICY IF EXISTS reg_select_own_or_admin ON public.registrations;

CREATE POLICY reg_select_own_or_admin
ON public.registrations
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_co_admin_of(auth.uid(), community)
  OR (
    status = 'approved'
    AND public.has_role(auth.uid(), 'executive_member'::app_role)
  )
);
