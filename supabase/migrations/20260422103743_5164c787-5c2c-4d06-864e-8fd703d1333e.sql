-- Function to compute storage stats per bucket (admin only)
CREATE OR REPLACE FUNCTION public.get_storage_stats()
RETURNS TABLE(bucket_id text, file_count bigint, total_bytes bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    o.bucket_id,
    COUNT(*)::bigint AS file_count,
    COALESCE(SUM((o.metadata->>'size')::bigint), 0)::bigint AS total_bytes
  FROM storage.objects o
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY o.bucket_id
  ORDER BY o.bucket_id;
$$;

REVOKE ALL ON FUNCTION public.get_storage_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storage_stats() TO authenticated;

-- Function to bulk-delete events older than N days (admin only)
CREATE OR REPLACE FUNCTION public.delete_old_events(_days int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin can delete old events';
  END IF;
  WITH del AS (
    DELETE FROM public.events
    WHERE event_date IS NOT NULL
      AND event_date < (now() - make_interval(days => _days))::date
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM del;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_old_events(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_old_events(int) TO authenticated;