-- =============================================================================
-- QuizByte – der Verlauf der Trefferquote
--
-- `get_my_daily_history` beantwortet "was war an welchem Tag", und zwar fuer
-- hoechstens dreissig Tage. Fuer die Frage "werde ich besser" ist das zweimal
-- das Falsche: dreissig Tage sind zu kurz, und ein Punkt je Tag ergibt ueber
-- ein Jahr dreihundertfuenfundsechzig Punkte, die niemand als Linie lesen kann.
--
-- Deshalb hier eine eigene Abfrage, die die Koernung an den Zeitraum anpasst:
-- bis zu einem Monat je Tag, bis zu einem halben Jahr je Woche, darueber je
-- Monat. Die Linie hat damit immer zwischen sieben und gut dreissig Punkten.
--
-- Gezaehlt werden erste Versuche je Frage – wie ueberall sonst im Fortschritt.
-- Eine Frage, die man wiederholt, bis sie sitzt, sagt nichts darueber, wie gut
-- man sie beim ersten Mal konnte.
-- =============================================================================

create or replace function public.get_my_accuracy_trend(p_days integer default 7)
returns table (
  bucket_start date,
  answered integer,
  correct integer,
  accuracy integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(2, least(coalesce(p_days, 7), 400));
  v_step interval;
  v_unit text;
begin
  -- Die Koernung haengt am Zeitraum, nicht an einer Einstellung: wer ein Jahr
  -- waehlt, will den Jahresverlauf sehen und nicht dreihundert Punkte.
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

  return query
  with buckets as (
    select generate_series(
      date_trunc(v_unit, (public.daily_quiz_day() - (v_days - 1))::timestamp),
      date_trunc(v_unit, public.daily_quiz_day()::timestamp),
      v_step
    )::date as bucket_start
  ),
  -- Der erste Versuch je Frage, mit dem Tag, an dem er stattfand. Dieselbe
  -- Regel wie `my_first_attempts()`, nur mit dem Datum dazu.
  firsts as (
    select distinct on (a.question_id) a.question_id, a.is_correct, a.answered_on
    from public.quiz_attempts a
    where a.user_id = auth.uid()
      and a.answered_on > public.daily_quiz_day() - v_days
    order by a.question_id, a.created_at, a.id
  ),
  grouped as (
    select
      date_trunc(v_unit, f.answered_on::timestamp)::date as bucket_start,
      count(*)::integer as answered,
      count(*) filter (where f.is_correct)::integer as correct
    from firsts f
    group by 1
  )
  select
    b.bucket_start,
    coalesce(g.answered, 0),
    coalesce(g.correct, 0),
    -- Ein Zeitraum ohne Antwort hat keine Quote. Null statt 0: eine 0 wuerde
    -- die Linie auf den Boden ziehen und wie ein sehr schlechter Tag aussehen,
    -- an dem in Wahrheit gar nicht gespielt wurde.
    case when coalesce(g.answered, 0) = 0
      then null
      else round(100.0 * g.correct / g.answered)::integer
    end
  from buckets b
  left join grouped g on g.bucket_start = b.bucket_start
  order by b.bucket_start;
end;
$$;

comment on function public.get_my_accuracy_trend(integer) is
  'Accuracy over time, bucketed by day/week/month depending on the range. Empty buckets return null, not zero.';

grant execute on function public.get_my_accuracy_trend(integer) to authenticated;
