drop policy if exists "photos_public_read" on storage.objects;
-- Public can still read individual files via direct URL (storage serves them via CDN);
-- but listing requires being authenticated and being the owner or admin.
create policy "photos_owner_or_admin_list" on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );