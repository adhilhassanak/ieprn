-- Helper for documentation_head
CREATE OR REPLACE FUNCTION public.is_documentation_head(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'documentation_head'
  );
$$;

-- Finance policies (enum values now committed)
DROP POLICY IF EXISTS "finance_insert" ON public.finance;
CREATE POLICY "finance_insert"
ON public.finance FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'finance_head') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "finance_select" ON public.finance;
CREATE POLICY "finance_select"
ON public.finance FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'finance_head') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "finance_delete_admin" ON public.finance;
CREATE POLICY "finance_delete_admin"
ON public.finance FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));