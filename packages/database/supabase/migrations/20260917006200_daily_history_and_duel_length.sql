-- =============================================================================
-- QuizByte – die letzten Tage als Zahlenreihe, und laengere Duelle
--
-- 1. Die Analyse soll zu jeder Kennzahl zeigen, wie sie sich ueber die Woche
--    entwickelt hat. Eine Abfrage liefert alle Reihen auf einmal: sechs
--    getrennte waeren sechs Rundreisen fuer dieselben sieben Tage.
--
-- 2. Fuenf Fragen sind fuer ein Duell in der Perfekten Runde zu wenig – zwei
--    halbwegs sichere Spieler haben beide alle fuenf, und das Duell endet
--    unentschieden, ohne etwas entschieden zu haben. Perfekte Runde geht auf
--    20, Survival auf 40.
-- =============================================================================

/**
 * Was an jedem der letzten Tage passiert ist.
 *
 * Eine Zeile je Tag, auch fuer Tage ohne jede Aktivitaet – eine Luecke in der
 * Reihe waere im Diagramm ein Sprung, und "nichts gespielt" ist selbst eine
 * Aussage.
 *
 * Gezaehlt wird nach `answered_on`, dem lokalen Datum des Geraets, mit dem die
 * Antwort geschickt wurde. Dasselbe Datum treibt den Streak, und zwei
 * Zaehlungen desselben Tages sollten nicht auseinanderlaufen.
 */
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
  )
  select
    d.day,
    (
      select count(*)::integer from public.quiz_attempts a
      where a.user_id = auth.uid() and a.answered_on = d.day
    ),
    (
      select count(*)::integer from public.quiz_attempts a
      where a.user_id = auth.uid() and a.answered_on = d.day and a.is_correct
    ),
    (
      select count(*)::integer from public.quiz_attempts a
      where a.user_id = auth.uid() and a.answered_on = d.day and not a.is_correct
    ),
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
  'One row per day for the last p_days, with the figures the analysis charts.';

grant execute on function public.get_my_daily_history(integer) to authenticated;

/** Wie viele Duelle ich insgesamt zu Ende gespielt habe. */
create or replace function public.count_my_duels()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.duels d
  where d.status = 'finished'
    and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid());
$$;

grant execute on function public.count_my_duels() to authenticated;

-- Laengere Duelle ------------------------------------------------------------

-- Bleibt in Deckung mit `duelQuestionCount` in packages/shared/src/domain/quiz/modes.ts.
create or replace function public.duel_question_count(p_mode public.quiz_mode)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_mode
    when 'blitz' then 20
    when 'survival' then 40
    when 'perfect' then 20
    else 5
  end;
$$;

comment on function public.duel_question_count(public.quiz_mode) is
  'Questions per duel round. Keep in sync with duelQuestionCount in packages/shared.';
