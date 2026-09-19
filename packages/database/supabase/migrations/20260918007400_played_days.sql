-- =============================================================================
-- QuizByte – die gespielten Tage, einzeln
--
-- Fuer das Kalendergitter der Streak. `get_my_history` buendelt ueber einem
-- Monat nach Wochen und Monaten – sinnvoll fuer Saeulen, unbrauchbar fuer einen
-- Kalender: "in dieser Woche gespielt" sagt nicht, an welchen Tagen, und ein
-- Gitter aus Wochenkaestchen ist kein Kalender mehr.
--
-- Zurueck kommen nur die Tage, an denen tatsaechlich etwas beantwortet wurde.
-- Die Luecken dazwischen ergeben sich daraus – das sind je nach Zeitraum ein
-- paar hundert Daten statt eines Eintrags fuer jeden Tag des Jahres.
-- =============================================================================

create or replace function public.get_my_played_days(p_days integer default 365)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select distinct a.answered_on
  from public.quiz_attempts a
  where a.user_id = auth.uid()
    and a.answered_on > public.daily_quiz_day() - greatest(1, least(coalesce(p_days, 365), 400))
  order by a.answered_on;
$$;

comment on function public.get_my_played_days(integer) is
  'The days the user answered at least one question on, within the last p_days.';

grant execute on function public.get_my_played_days(integer) to authenticated;
