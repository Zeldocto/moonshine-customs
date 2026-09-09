-- =====================================================================
-- Moonshine Skins — 0004 Storage buckets and policies
--
-- Path convention, enforced by both the CHECK constraint on
-- skins.file_path and the policies below:
--
--   skins/<auth-user-uuid>/<skin-uuid>.txt
--   avatars/<auth-user-uuid>/avatar-<timestamp>.<ext>
--
-- The first path segment must equal the uploader's own user id, which is
-- what makes "you can only touch your own files" true at the storage layer.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('skins',   'skins',   true, 51200,   array['text/plain']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects already has RLS enabled on a Supabase project.

-- ------------------------------- skins --------------------------------
drop policy if exists "skins read for everyone" on storage.objects;
create policy "skins read for everyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'skins');

drop policy if exists "skins insert own folder" on storage.objects;
create policy "skins insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'skins'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
    and name ~ '\.txt$'
    and not public.is_banned()
  );

drop policy if exists "skins update own folder" on storage.objects;
create policy "skins update own folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'skins' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'skins' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "skins delete own folder" on storage.objects;
create policy "skins delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'skins'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff())
  );

-- ------------------------------ avatars -------------------------------
drop policy if exists "avatars read for everyone" on storage.objects;
create policy "avatars read for everyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars write own folder" on storage.objects;
create policy "avatars write own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
    and not public.is_banned()
  );

drop policy if exists "avatars update own folder" on storage.objects;
create policy "avatars update own folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars delete own folder" on storage.objects;
create policy "avatars delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff())
  );
