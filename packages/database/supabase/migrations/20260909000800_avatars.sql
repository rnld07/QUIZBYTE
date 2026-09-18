-- =============================================================================
-- QuizByte – storage bucket for user avatars
--
-- Unlike question media, avatars are written by the users themselves. Every
-- file must live in a folder named after the owner's user id:
--
--   avatars/<auth.uid()>/<file name>
--
-- The bucket is public-read because profiles.avatar_url stores a plain URL that
-- is rendered without an authenticated request.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars: users upload into own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "avatars: users update own files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "avatars: users delete own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "avatars: admins manage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'avatars' and public.is_admin())
  with check (bucket_id = 'avatars' and public.is_admin());
