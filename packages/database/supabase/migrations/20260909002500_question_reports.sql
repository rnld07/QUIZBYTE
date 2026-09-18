-- =============================================================================
-- QuizByte – Fragen melden
--
-- Im Quiz sitzt neben den Einstellungen ein Melde-Symbol. Wer dort eine Frage
-- meldet, wählt einen Grund und kann eine Begründung mitschicken.
--
-- Meldungen gehören dem Nutzer: er darf eigene anlegen und lesen, sonst
-- niemand. Redaktion und Auswertung laufen über die Admin-Rolle, nicht über
-- die App.
--
-- Außerdem tauschen Hardware und IT-Security auf der Startseite die Plätze.
-- =============================================================================

create type public.report_reason as enum (
  'wrong_answer',
  'wrong_question',
  'outdated',
  'typo',
  'unclear',
  'other'
);

create type public.report_status as enum ('open', 'reviewed', 'rejected');

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  reason public.report_reason not null,
  -- Freitext des Nutzers; leer erlaubt, der Grund allein reicht.
  details text not null default '' check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

comment on table public.question_reports is 'Von Nutzern gemeldete Fragen samt Begründung.';

create index question_reports_question_idx on public.question_reports (question_id, created_at desc);
create index question_reports_status_idx on public.question_reports (status, created_at desc);

alter table public.question_reports enable row level security;

create policy "question_reports: users read own"
  on public.question_reports for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "question_reports: users insert own"
  on public.question_reports for insert
  to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.question_reports to authenticated;

-- Hardware und IT-Security tauschen die Plätze -----------------------------------------

update public.categories set sort_order = 40 where slug = 'it-security';
update public.categories set sort_order = 20 where slug = 'hardware';
