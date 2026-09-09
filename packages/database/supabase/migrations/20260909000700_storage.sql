-- =============================================================================
-- QuizByte – storage buckets for question images and pre-generated audio
--
-- Files are public-read (URLs are stored on questions) and admin-write only.
-- Audio is generated once by the admin backend (ElevenLabs) and stored here;
-- the mobile app only ever downloads the finished file.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('question-images', 'question-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('question-audio', 'question-audio', true, 10485760, array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav'])
on conflict (id) do nothing;

create policy "question media: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('question-images', 'question-audio'));

create policy "question media: admins upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('question-images', 'question-audio') and public.is_admin());

create policy "question media: admins update"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('question-images', 'question-audio') and public.is_admin())
  with check (bucket_id in ('question-images', 'question-audio') and public.is_admin());

create policy "question media: admins delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('question-images', 'question-audio') and public.is_admin());
