
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique_idx ON public.events(slug) WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_event_slug(_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
  words text[];
BEGIN
  base := lower(coalesce(_name, ''));
  -- keep alnum + spaces + hyphens only
  base := regexp_replace(base, '[^a-z0-9\s-]', '', 'g');
  -- collapse whitespace
  base := regexp_replace(trim(base), '\s+', ' ', 'g');
  words := string_to_array(base, ' ');
  IF array_length(words, 1) IS NULL THEN
    base := 'event';
  ELSE
    base := array_to_string(words[1:LEAST(4, array_length(words,1))], '-');
  END IF;
  base := regexp_replace(base, '-+', '-', 'g');
  base := trim(both '-' from base);
  IF base = '' THEN base := 'event'; END IF;

  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = candidate) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_event_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    NEW.slug := public.generate_event_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_set_slug ON public.events;
CREATE TRIGGER events_set_slug
BEFORE INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_event_slug();

-- Backfill existing rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, name FROM public.events WHERE slug IS NULL OR slug = '' LOOP
    UPDATE public.events SET slug = public.generate_event_slug(r.name) WHERE id = r.id;
  END LOOP;
END $$;
