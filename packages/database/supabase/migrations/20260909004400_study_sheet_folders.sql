-- =============================================================================
-- QuizByte – Ordner fuer Lernzettel
--
-- Manche Lernzettel gehoeren zusammen, ohne derselbe Lernzettel zu sein:
-- Tastenkombinationen unter Windows und unter macOS etwa. Ein Ordner fasst sie
-- zusammen; in der App liegen sie dann als Stapel uebereinander, und erst nach
-- dem Antippen waehlt man einen davon aus.
--
-- Der Ordner ist bewusst duenn: ein Titel und eine Reihenfolge. Alles, was
-- einen Lernzettel ausmacht, bleibt am Lernzettel.
-- =============================================================================

create table public.study_sheet_folders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text check (description is null or char_length(description) <= 500),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.study_sheet_folders is 'Ordner, der mehrere Lernzettel zu einem Stapel zusammenfasst.';

create index study_sheet_folders_order_idx
  on public.study_sheet_folders (is_published, sort_order, created_at desc);

create trigger study_sheet_folders_set_updated_at
  before update on public.study_sheet_folders
  for each row execute function public.set_updated_at();

-- Ein geloeschter Ordner nimmt seine Lernzettel nicht mit: sie liegen danach
-- wieder einzeln in der Uebersicht, statt still zu verschwinden.
alter table public.study_sheets
  add column folder_id uuid references public.study_sheet_folders (id) on delete set null;

comment on column public.study_sheets.folder_id is 'Ordner, in dem der Lernzettel liegt – oder NULL, wenn er einzeln steht.';

create index study_sheets_folder_idx on public.study_sheets (folder_id, sort_order, created_at desc);

-- RLS -------------------------------------------------------------------------------------

alter table public.study_sheet_folders enable row level security;

create policy "study_sheet_folders: everyone reads published"
  on public.study_sheet_folders for select
  to authenticated
  using (is_published or public.is_admin());

create policy "study_sheet_folders: admins insert"
  on public.study_sheet_folders for insert
  to authenticated
  with check (public.is_admin());

create policy "study_sheet_folders: admins update"
  on public.study_sheet_folders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "study_sheet_folders: admins delete"
  on public.study_sheet_folders for delete
  to authenticated
  using (public.is_admin());

grant select on public.study_sheet_folders to authenticated;
grant insert, update, delete on public.study_sheet_folders to authenticated;
