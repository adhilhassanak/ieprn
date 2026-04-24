-- Helper: detect role via approved registration position
CREATE OR REPLACE FUNCTION public.has_approved_position(_user_id uuid, _position text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE user_id = _user_id
      AND status = 'approved'
      AND lower(trim(current_position)) = lower(trim(_position))
  );
$$;

-- Update finance INSERT policy to allow Finance Head by position OR finance_head role OR admin
DROP POLICY IF EXISTS finance_insert ON public.finance;
CREATE POLICY finance_insert
ON public.finance
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'finance_head')
  OR public.has_approved_position(auth.uid(), 'Finance Head')
);

-- Update finance SELECT policy similarly
DROP POLICY IF EXISTS finance_select ON public.finance;
CREATE POLICY finance_select
ON public.finance
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'finance_head')
  OR public.has_approved_position(auth.uid(), 'Finance Head')
);