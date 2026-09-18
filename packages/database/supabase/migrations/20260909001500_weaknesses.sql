-- =============================================================================
-- QuizByte – „Deine Schwächen" als Fragenliste
--
-- Bisher fiel eine Frage automatisch aus den Schwächen, sobald sie einmal
-- richtig beantwortet wurde. Neu:
--   * jede jemals falsch beantwortete Frage bleibt in der Liste
--   * sie verschwindet nur, wenn der Nutzer sie selbst entfernt
--
-- Außerdem: eine bereits beantwortete Frage bringt beim erneuten Beantworten
-- keine XP mehr.
-- =============================================================================

-- Manuell entfernte Schwächen ---------------------------------------------------------

create table public.dismissed_weaknesses (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

comment on table public.dismissed_weaknesses is 'Fragen, die der Nutzer aus „Deine Schwächen" entfernt hat.';

alter table public.dismissed_weaknesses enable row level security;

create policy "dismissed_weaknesses: users read own"
  on public.dismissed_weaknesses for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "dismissed_weaknesses: users insert own"
  on public.dismissed_weaknesses for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "dismissed_weaknesses: users delete own"
  on public.dismissed_weaknesses for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.dismissed_weaknesses to authenticated;

-- Schwächen: alles jemals Falsche, außer manuell Entferntes ---------------------------

create or replace function public.count_my_wrong_questions()
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and exists (
      select 1 from public.quiz_attempts a
      where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
    )
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    );
$$;

create or replace function public.get_my_wrong_questions(p_limit integer default 30)
returns setof public.questions
language sql
stable
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and exists (
      select 1 from public.quiz_attempts a
      where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
    )
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    )
  order by (
    select max(a.created_at) from public.quiz_attempts a
    where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
  ) desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

-- Fragen einer abgeschlossenen Runde (für „Letzte Aktivität") --------------------------

create or replace function public.get_my_session_questions(p_session_id uuid)
returns setof public.questions
language sql
stable
security definer
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.quiz_attempts a on a.question_id = q.id
  where a.quiz_session_id = p_session_id
    and a.user_id = auth.uid()
  order by a.created_at;
$$;

grant execute on function public.get_my_session_questions(uuid) to authenticated;

-- Keine XP für eine Frage, die schon einmal beantwortet wurde --------------------------

create or replace function public.score_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correct public.answer_key;
  v_difficulty public.difficulty_level;
  v_session public.quiz_sessions%rowtype;
  v_seen boolean;
  v_server_date date := (now() at time zone 'utc')::date;
begin
  select * into v_session from public.quiz_sessions where id = new.quiz_session_id;
  if not found then
    raise exception 'quiz session not found' using errcode = 'foreign_key_violation';
  end if;
  if v_session.user_id <> new.user_id then
    raise exception 'attempt user does not match session user' using errcode = 'insufficient_privilege';
  end if;
  if v_session.completed_at is not null then
    raise exception 'quiz session is already completed' using errcode = 'check_violation';
  end if;

  select correct_answer, difficulty into v_correct, v_difficulty
  from public.questions
  where id = new.question_id and status = 'published';
  if not found then
    raise exception 'question is not available' using errcode = 'foreign_key_violation';
  end if;

  -- Local dates can legitimately differ from UTC by at most one day.
  if new.answered_on < v_server_date - 1 or new.answered_on > v_server_date + 1 then
    new.answered_on := v_server_date;
  end if;

  new.is_correct := (new.selected_answer = v_correct);

  -- Repeats still count towards the statistics, but no longer pay out.
  select exists (
    select 1 from public.quiz_attempts a
    where a.question_id = new.question_id and a.user_id = new.user_id
  ) into v_seen;

  new.xp_earned := case when v_seen then 0 else public.xp_for_answer(new.is_correct, v_difficulty) end;
  return new;
end;
$$;
