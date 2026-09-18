-- =============================================================================
-- QuizByte – Lernzettel
--
-- Admins laden im Adminbereich ein PDF hoch. Beim Hochladen wird jede Seite im
-- Browser zu einem PNG gerendert und mitgespeichert – die App zeigt die Seiten
-- als Bilder an (Vorschau und Ansicht) und braucht dafuer keinen PDF-Renderer.
-- Das Original-PDF bleibt daneben liegen, damit man es speichern und teilen
-- kann.
--
-- Reihenfolge zaehlt: `page_paths[1]` ist Seite 1 und zugleich das Vorschaubild.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-sheets',
  'study-sheets',
  true,
  26214400, -- 25 MB: ein Lernzettel-PDF mit Bildern kann gross werden
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "study sheets: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'study-sheets');

create policy "study sheets: admins upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'study-sheets' and public.is_admin());

create policy "study sheets: admins update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'study-sheets' and public.is_admin())
  with check (bucket_id = 'study-sheets' and public.is_admin());

create policy "study sheets: admins delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'study-sheets' and public.is_admin());

-- Tabelle ---------------------------------------------------------------------------------

create table public.study_sheets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text check (description is null or char_length(description) <= 500),
  -- Optional: ein Lernzettel kann zu einer Kategorie gehoeren, muss aber nicht.
  category_id uuid references public.categories (id) on delete set null,
  /** Oeffentliche URL des Original-PDFs. */
  pdf_url text not null,
  /** Eine URL je Seite, in Reihenfolge. Die erste ist die Vorschau. */
  page_urls text[] not null default '{}',
  page_count integer not null default 0 check (page_count >= 0),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.study_sheets is 'Lernzettel: PDF plus je Seite ein gerendertes Bild.';

create index study_sheets_order_idx on public.study_sheets (is_published, sort_order, created_at desc);

create trigger study_sheets_set_updated_at
  before update on public.study_sheets
  for each row execute function public.set_updated_at();

alter table public.study_sheets enable row level security;

create policy "study_sheets: everyone reads published"
  on public.study_sheets for select
  to authenticated
  using (is_published or public.is_admin());

create policy "study_sheets: admins insert"
  on public.study_sheets for insert
  to authenticated
  with check (public.is_admin());

create policy "study_sheets: admins update"
  on public.study_sheets for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "study_sheets: admins delete"
  on public.study_sheets for delete
  to authenticated
  using (public.is_admin());

grant select on public.study_sheets to authenticated;
grant insert, update, delete on public.study_sheets to authenticated;
