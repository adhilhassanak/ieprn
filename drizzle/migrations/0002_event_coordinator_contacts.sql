CREATE OR REPLACE FUNCTION public.get_event_coordinator_contacts(_event_id uuid)
RETURNS TABLE(name text, gmail text, phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.full_name, r.gmail, r.phone
  FROM public.events e
  JOIN public.registrations r
    ON lower(trim(r.full_name)) = ANY (
      SELECT lower(trim(n)) FROM unnest(e.coordinator_names) AS n
    )
  WHERE e.id = _event_id
    AND e.status IN ('published', 'completed')
    AND r.status = 'approved';
$$;

GRANT EXECUTE ON FUNCTION public.get_event_coordinator_contacts(uuid) TO anon, authenticated;