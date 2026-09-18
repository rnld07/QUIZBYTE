-- =============================================================================
-- QuizByte – Ideen für die App einreichen
--
-- Unter „Mehr" können Nutzer Vorschläge schicken: ein Bereich, ein Titel und
-- eine Beschreibung. Der Status läuft über dasselbe Enum wie die
-- Fragen-Meldungen – offen, angesehen, abgelehnt.
--
-- Wie bei den Meldungen gilt: eigene Einträge anlegen und lesen, mehr nicht.
-- Anders als dort bekommt der Nutzer seine Einreichungen aber zu sehen, damit
-- er weiß, was angekommen ist.
-- =============================================================================

create type public.idea_area as enum (
  'questions',
  'quiz',
  'design',
  'progress',
  'other'
);

create table public.app_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area public.idea_area not null default 'other',
  title text not null check (char_length(trim(title)) between 3 and 120),
  details text not null default '' check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

comment on table public.app_ideas is 'Von Nutzern eingereichte Ideen und Wünsche für die App.';

create index app_ideas_user_created_idx on public.app_ideas (user_id, created_at desc);
create index app_ideas_status_idx on public.app_ideas (status, created_at desc);

alter table public.app_ideas enable row level security;

create policy "app_ideas: users read own"
  on public.app_ideas for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "app_ideas: users insert own"
  on public.app_ideas for insert
  to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.app_ideas to authenticated;
