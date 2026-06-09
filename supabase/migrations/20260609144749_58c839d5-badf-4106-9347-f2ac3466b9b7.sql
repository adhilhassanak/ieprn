CREATE OR REPLACE FUNCTION public.validate_event_coordinators()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.status = 'published' OR NEW.registration_open = true) THEN
    IF NEW.coordinator_names IS NULL OR array_length(NEW.coordinator_names, 1) IS NULL OR array_length(NEW.coordinator_names, 1) < 1 THEN
      RAISE EXCEPTION 'At least 1 coordinator is required to publish or open registrations for an event';
    END IF;
    IF array_length(NEW.coordinator_names, 1) > 2 THEN
      RAISE EXCEPTION 'A maximum of 2 coordinators is allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;