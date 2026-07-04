
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visible_to text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill existing events: default visibility = [owner community]
UPDATE public.events
SET visible_to = ARRAY[community]
WHERE (visible_to IS NULL OR array_length(visible_to, 1) IS NULL)
  AND community IS NOT NULL;

-- Ensure owner community is always present in visible_to
CREATE OR REPLACE FUNCTION public.ensure_event_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visible_to IS NULL OR array_length(NEW.visible_to, 1) IS NULL THEN
    NEW.visible_to := ARRAY[NEW.community];
  ELSIF NOT (NEW.community = ANY(NEW.visible_to)) THEN
    NEW.visible_to := array_prepend(NEW.community, NEW.visible_to);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_event_visibility ON public.events;
CREATE TRIGGER trg_ensure_event_visibility
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.ensure_event_visibility();
