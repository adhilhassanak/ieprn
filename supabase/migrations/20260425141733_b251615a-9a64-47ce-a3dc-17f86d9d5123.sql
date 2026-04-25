CREATE UNIQUE INDEX IF NOT EXISTS registrations_one_active_per_community
ON public.registrations (user_id, community)
WHERE status IN ('pending', 'approved');