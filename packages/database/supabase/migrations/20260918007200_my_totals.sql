-- =============================================================================
-- QuizByte – die Gesamtzahlen, wahlweise fuer einen Zeitraum
--
-- Die sechs Kacheln unter "Insgesamt" lasen bisher `user_progress`, und das
-- kennt nur eine Zahl: die seit Beginn. "Wie lief der letzte Monat" liess sich
-- damit nicht beantworten.
--
-- `p_days = null` heisst weiterhin "seit Beginn" – dann kommen dieselben Zahlen
-- heraus wie vorher, aus derselben Quelle. Mit einem Zeitraum wird stattdessen
-- gezaehlt, und zwar nach denselben Regeln wie ueberall sonst im Fortschritt:
-- erste Versuche je Frage.
--
-- Die laengste Strecke ist dabei die laengste Folge gespielter Tage *innerhalb*
-- des Zeitraums. Ueber alles gerechnet steht sie in `user_progress` und wird von
-- dort genommen – eine zweite Rechnung fuer dieselbe Zahl waere eine, die
-- irgendwann abweicht.
-- =============================================================================

create or replace function public.get_my_totals(p_days integer default null)
returns table (
  answered integer,
  correct integer,
  wrong integer,
  sessions integer,
  perfect integer,
  duels integer,
  longest_streak integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from date;
begin
  -- Ohne Zeitraum: die gefuehrten Gesamtzahlen, unveraendert.
  if p_days is null or p_days <= 0 then
    return query
    select
      coalesce(up.total_questions_answered, 0),
      coalesce(up.total_correct_answers, 0),
      greatest(0, coalesce(up.total_questions_answered, 0) - coalesce(up.total_correct_answers, 0)),
      coalesce(up.total_sessions_completed, 0),
      (
        select count(*)::integer from public.quiz_sessions s
        where s.user_id = auth.uid()
          and s.completed_at is not null
          and s.total_questions > 0
          and (
            select count(*) from public.quiz_attempts a
            where a.quiz_session_id = s.id and a.is_correct
          ) = s.total_questions
      ),
      (
        select count(*)::integer from public.duels d
        where d.status = 'finished'
          and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())
      ),
      coalesce(up.longest_streak, 0)
    from public.user_progress up
    where up.user_id = auth.uid();

    -- Wer noch keine Fortschrittszeile hat, bekommt Nullen statt gar nichts.
    if not found then
      return query select 0, 0, 0, 0, 0, 0, 0;
    end if;

    return;
  end if;

  v_from := public.daily_quiz_day() - (least(p_days, 3650) - 1);

  return query
  with firsts as (
    select distinct on (a.question_id) a.question_id, a.is_correct, a.answered_on
    from public.quiz_attempts a
    where a.user_id = auth.uid()
    order by a.question_id, a.created_at, a.id
  ),
  in_range as (
    select * from firsts f where f.answered_on >= v_from
  ),
  -- Die laengste Folge zusammenhaengender Tage: der Abstand zwischen Datum und
  -- laufender Nummer ist innerhalb einer Serie konstant, also gruppiert er sie.
  played_days as (
    select distinct f.answered_on as day from in_range f
  ),
  runs as (
    select d.day - (row_number() over (order by d.day))::integer as run_key
    from played_days d
  )
  select
    (select count(*)::integer from in_range),
    (select count(*)::integer from in_range f where f.is_correct),
    (select count(*)::integer from in_range f where not f.is_correct),
    (
      select count(*)::integer from public.quiz_sessions s
      where s.user_id = auth.uid()
        and s.completed_at is not null
        and (s.completed_at at time zone 'Europe/Berlin')::date >= v_from
    ),
    (
      select count(*)::integer from public.quiz_sessions s
      where s.user_id = auth.uid()
        and s.completed_at is not null
        and (s.completed_at at time zone 'Europe/Berlin')::date >= v_from
        and s.total_questions > 0
        and (
          select count(*) from public.quiz_attempts a
          where a.quiz_session_id = s.id and a.is_correct
        ) = s.total_questions
    ),
    (
      select count(*)::integer from public.duels d
      where d.status = 'finished'
        and (d.finished_at at time zone 'Europe/Berlin')::date >= v_from
        and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())
    ),
    coalesce((select max(c) from (select count(*)::integer as c from runs group by run_key) x), 0);
end;
$$;

comment on function public.get_my_totals(integer) is
  'The six progress figures, either all-time (p_days null) or within the last p_days.';

grant execute on function public.get_my_totals(integer) to authenticated;
