-- =============================================================================
-- QuizByte – der Wochenverlauf zaehlt dasselbe wie die Gesamtzahlen
--
-- Im Diagramm stand mehr als in der Kachel darueber: "diese Woche 41 richtig"
-- bei insgesamt 30. Der Grund ist die Zaehlweise. Jede Kennzahl im Fortschritt
-- zaehlt **erste Versuche je Frage** – wer eine Frage wiederholt, die er schon
-- konnte, weiss deswegen nicht mehr. Der Tagesverlauf zaehlte dagegen jede
-- Antwort, Wiederholungen eingeschlossen.
--
-- Zwei Zaehlungen derselben Sache, die auseinanderlaufen, sind eine zu viel.
-- Der Verlauf zaehlt jetzt ebenfalls erste Versuche: eine Frage faellt auf den
-- Tag, an dem sie zum ersten Mal beantwortet wurde.
-- =============================================================================

create or replace function public.get_my_daily_history(p_days integer default 7)
returns table (
  day date,
  answered integer,
  correct integer,
  wrong integer,
  sessions integer,
  perfect integer,
  duels integer
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
    (
      select count(*)::integer from public.duels x
      where x.status = 'finished'
        and (x.finished_at at time zone 'utc')::date = d.day
        and (x.challenger_id = auth.uid() or x.opponent_id = auth.uid())
    )
  from days d
  order by d.day;
$$;

comment on function public.get_my_daily_history(integer) is
  'One row per day for the last p_days. Answers are counted as first attempts, like every other progress figure.';

grant execute on function public.get_my_daily_history(integer) to authenticated;
