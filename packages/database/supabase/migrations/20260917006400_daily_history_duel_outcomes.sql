-- =============================================================================
-- QuizByte – der Wochenverlauf kennt den Ausgang der Duelle
--
-- "Drei Duelle am Dienstag" ist die halbe Auskunft. Interessant ist, wie sie
-- ausgegangen sind – und das steht in `duels.winner_id` ohnehin schon da:
-- ich selbst = gewonnen, niemand = unentschieden, der andere = verloren.
--
-- Die Gesamtzahl `duels` bleibt, damit die bisherige Saeule weiterhin geht;
-- die drei neuen Spalten summieren sich zu ihr.
--
-- Rueckgabetyp aendert sich, deshalb erst weg damit: `create or replace` kann
-- das nicht (SQLSTATE 42P13).
-- =============================================================================

drop function if exists public.get_my_daily_history(integer);

create function public.get_my_daily_history(p_days integer default 7)
returns table (
  day date,
  answered integer,
  correct integer,
  wrong integer,
  sessions integer,
  perfect integer,
  duels integer,
  duels_won integer,
  duels_drawn integer,
  duels_lost integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select generate_series(
      (now() at time zone 'utc')::date - (greatest(1, least(coalesce(p_days, 7), 30)) - 1),
      (now() at time zone 'utc')::date,
      interval '1 day'
    )::date as day
  ),
  -- Der erste Versuch je Frage, mit dem Tag, an dem er stattfand. Dieselbe
  -- Regel wie `my_first_attempts()`, nur dass hier auch das Datum gebraucht
  -- wird.
  firsts as (
    select distinct on (a.question_id) a.question_id, a.is_correct, a.answered_on
    from public.quiz_attempts a
    where a.user_id = auth.uid()
    order by a.question_id, a.created_at, a.id
  ),
  -- Die beendeten Duelle des Zeitraums, je Tag und Ausgang.
  duel_days as (
    select
      (x.finished_at at time zone 'utc')::date as day,
      count(*)::integer as played,
      count(*) filter (where x.winner_id = auth.uid())::integer as won,
      count(*) filter (where x.winner_id is null)::integer as drawn,
      count(*) filter (where x.winner_id is not null and x.winner_id <> auth.uid())::integer as lost
    from public.duels x
    where x.status = 'finished'
      and (x.challenger_id = auth.uid() or x.opponent_id = auth.uid())
    group by 1
  )
  select
    d.day,
    (select count(*)::integer from firsts f where f.answered_on = d.day),
    (select count(*)::integer from firsts f where f.answered_on = d.day and f.is_correct),
    (select count(*)::integer from firsts f where f.answered_on = d.day and not f.is_correct),
    (
      select count(*)::integer from public.quiz_sessions s
      where s.user_id = auth.uid() and (s.completed_at at time zone 'utc')::date = d.day
    ),
    (
      select count(*)::integer from public.quiz_sessions s
      where s.user_id = auth.uid()
        and (s.completed_at at time zone 'utc')::date = d.day
        and s.total_questions > 0
        and (
          select count(*) from public.quiz_attempts a
          where a.quiz_session_id = s.id and a.is_correct
        ) = s.total_questions
    ),
    coalesce(dd.played, 0),
    coalesce(dd.won, 0),
    coalesce(dd.drawn, 0),
    coalesce(dd.lost, 0)
  from days d
  left join duel_days dd on dd.day = d.day
  order by d.day;
$$;

comment on function public.get_my_daily_history(integer) is
  'One row per day for the last p_days. Answers are counted as first attempts, like every other progress figure. Duels are split by outcome.';

grant execute on function public.get_my_daily_history(integer) to authenticated;
