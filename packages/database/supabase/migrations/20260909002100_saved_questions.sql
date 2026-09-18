-- =============================================================================
-- QuizByte – Gespeicherte Fragen
--
-- Im Quiz kann jede Frage über das Lesezeichen-Symbol gemerkt werden. Auf der
-- Fortschrittsseite erscheinen die gemerkten Fragen unter „Gespeichert" und
-- lassen sich von dort erneut spielen oder wieder entfernen.
--
-- Die Liste ist bewusst rein manuell: nichts kommt automatisch hinein und
-- nichts verschwindet von allein.
-- =============================================================================

create table public.saved_questions (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

comment on table public.saved_questions is 'Fragen, die der Nutzer im Quiz gespeichert hat.';

-- Die Liste wird immer nach „zuletzt gespeichert" sortiert gelesen.
create index saved_questions_user_created_idx
  on public.saved_questions (user_id, created_at desc);

alter table public.saved_questions enable row level security;

create policy "saved_questions: users read own"
  on public.saved_questions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "saved_questions: users insert own"
  on public.saved_questions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "saved_questions: users delete own"
  on public.saved_questions for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.saved_questions to authenticated;

-- Gespeicherte Fragen, zuletzt gespeicherte zuerst ------------------------------------

create or replace function public.get_my_saved_questions(p_limit integer default 50)
returns setof public.questions
language sql
stable
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.saved_questions s on s.question_id = q.id
  join public.categories c on c.id = q.category_id
  where s.user_id = auth.uid()
    and q.status = 'published'
    and c.is_active = true
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
  order by s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

grant execute on function public.get_my_saved_questions(integer) to authenticated;
