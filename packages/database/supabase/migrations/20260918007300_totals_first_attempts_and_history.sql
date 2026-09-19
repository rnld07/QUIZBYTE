-- =============================================================================
-- QuizByte – zwei Sachen an "Insgesamt"
--
-- 1. Der Gesamtzeitraum zaehlte anders als jeder Zeitraum darunter.
--
--    "Gesamt" las `user_progress.total_questions_answered`. Das ist ein
--    Zaehler, den ein Trigger bei *jeder* Antwort hochzaehlt, Wiederholungen
--    eingeschlossen. Alles andere im Fortschritt zaehlt dagegen erste Versuche
--    je Frage – wer eine Frage wiederholt, die er schon konnte, weiss deswegen
--    nicht mehr.
--
--    Bei einem Konto mit 50 beantworteten und 187 gegebenen Antworten standen
--    deshalb im Gesamtzeitraum 187 und in jedem anderen 50. Zwei Zaehlungen
--    derselben Sache, von denen eine zu viel ist: "Gesamt" zaehlt jetzt
--    ebenfalls erste Versuche.
--
--    Die laengste Strecke bleibt der gefuehrte Wert – die haengt an Tagen, nicht
--    an Antworten, und wird vom Trigger korrekt fortgeschrieben.
--
-- 2. Der Verlauf je Kennzahl, mit derselben Koernung wie die Quotenlinie.
--
--    `get_my_daily_history` kann hoechstens dreissig Tage und immer nur je Tag.
--    Fuer "letzte 6 Monate" braucht es Wochen, fuer ein Jahr Monate – sonst hat
--    das Diagramm dreihundert Saeulen.
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
  -- Ohne Zeitraum: seit Beginn, aber nach derselben Regel wie mit Zeitraum.
  -- `v_from` bleibt null und faellt damit aus jeder Bedingung heraus.
  if p_days is not null and p_days > 0 then
    v_from := public.daily_quiz_day() - (least(p_days, 3650) - 1);
  end if;

  return query
  with firsts as (
    select distinct on (a.question_id) a.question_id, a.is_correct, a.answered_on
    from public.quiz_attempts a
    where a.user_id = auth.uid()
    order by a.question_id, a.created_at, a.id
  ),
  in_range as (
    select * from firsts f where v_from is null or f.answered_on >= v_from
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
        and (v_from is null or (s.completed_at at time zone 'Europe/Berlin')::date >= v_from)
    ),
    (
      select count(*)::integer from public.quiz_sessions s
      where s.user_id = auth.uid()
        and s.completed_at is not null
        and (v_from is null or (s.completed_at at time zone 'Europe/Berlin')::date >= v_from)
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
        and (v_from is null or (d.finished_at at time zone 'Europe/Berlin')::date >= v_from)
    ),
    -- Ueber alles steht die laengste Strecke gefuehrt in `user_progress`; fuer
    -- einen Zeitraum wird sie aus den gespielten Tagen darin gerechnet.
    case
      when v_from is null then coalesce((select up.longest_streak from public.user_progress up where up.user_id = auth.uid()), 0)
      else coalesce((select max(c) from (select count(*)::integer as c from runs group by run_key) x), 0)
    end;
end;
$$;

comment on function public.get_my_totals(integer) is
  'The six progress figures, all-time (p_days null) or within the last p_days. Answers are first attempts per question throughout.';

grant execute on function public.get_my_totals(integer) to authenticated;


/**
 * Der Verlauf aller Kennzahlen, gebuendelt nach Tag, Woche oder Monat.
 *
 * Dieselbe Koernungsregel wie `get_my_accuracy_trend`, damit die Diagramme auf
 * einer Seite nicht verschieden dicht sind. Ohne Zeitraum: ein Jahr in Monaten –
 * "seit Beginn" hat kein Ende, ein Diagramm aber schon.
 */
create or replace function public.get_my_history(p_days integer default 7)
returns table (
  bucket_start date,
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
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(2, least(coalesce(p_days, 365), 400));
  v_step interval;
  v_unit text;
  v_from date;
begin
  if v_days <= 31 then
    v_unit := 'day';
    v_step := interval '1 day';
  elsif v_days <= 190 then
    v_unit := 'week';
    v_step := interval '1 week';
  else
    v_unit := 'month';
    v_step := interval '1 month';
  end if;

  v_from := public.daily_quiz_day() - (v_days - 1);

  return query
  with buckets as (
    select generate_series(
      date_trunc(v_unit, v_from::timestamp),
      date_trunc(v_unit, public.daily_quiz_day()::timestamp),
      v_step
    )::date as bucket_start
  ),
  firsts as (
    select distinct on (a.question_id) a.question_id, a.is_correct, a.answered_on
    from public.quiz_attempts a
    where a.user_id = auth.uid() and a.answered_on >= v_from
    order by a.question_id, a.created_at, a.id
  ),
  answers as (
    select
      date_trunc(v_unit, f.answered_on::timestamp)::date as bucket_start,
      count(*)::integer as answered,
      count(*) filter (where f.is_correct)::integer as correct,
      count(*) filter (where not f.is_correct)::integer as wrong
    from firsts f
    group by 1
  ),
  runs as (
    select
      date_trunc(v_unit, (s.completed_at at time zone 'Europe/Berlin')::date::timestamp)::date as bucket_start,
      count(*)::integer as sessions,
      count(*) filter (
        where s.total_questions > 0
          and (select count(*) from public.quiz_attempts a where a.quiz_session_id = s.id and a.is_correct) = s.total_questions
      )::integer as perfect
    from public.quiz_sessions s
    where s.user_id = auth.uid()
      and s.completed_at is not null
      and (s.completed_at at time zone 'Europe/Berlin')::date >= v_from
    group by 1
  ),
  fights as (
    select
      date_trunc(v_unit, (d.finished_at at time zone 'Europe/Berlin')::date::timestamp)::date as bucket_start,
      count(*)::integer as duels,
      count(*) filter (where d.winner_id = auth.uid())::integer as won,
      count(*) filter (where d.winner_id is null)::integer as drawn,
      count(*) filter (where d.winner_id is not null and d.winner_id <> auth.uid())::integer as lost
    from public.duels d
    where d.status = 'finished'
      and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())
      and (d.finished_at at time zone 'Europe/Berlin')::date >= v_from
    group by 1
  )
  select
    b.bucket_start,
    coalesce(a.answered, 0),
    coalesce(a.correct, 0),
    coalesce(a.wrong, 0),
    coalesce(r.sessions, 0),
    coalesce(r.perfect, 0),
    coalesce(f.duels, 0),
    coalesce(f.won, 0),
    coalesce(f.drawn, 0),
    coalesce(f.lost, 0)
  from buckets b
  left join answers a on a.bucket_start = b.bucket_start
  left join runs r on r.bucket_start = b.bucket_start
  left join fights f on f.bucket_start = b.bucket_start
  order by b.bucket_start;
end;
$$;

comment on function public.get_my_history(integer) is
  'Every progress figure over time, bucketed by day/week/month depending on the range.';

grant execute on function public.get_my_history(integer) to authenticated;
