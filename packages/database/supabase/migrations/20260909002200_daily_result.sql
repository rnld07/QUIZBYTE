-- =============================================================================
-- QuizByte – Ergebnis der bezahlten Daily-Runde
--
-- Spielt man das Daily Quiz ein zweites Mal, gibt es keine XP mehr. Die
-- Auswertung soll trotzdem den Balken zeigen – nur eben mit dem Ergebnis der
-- ersten Runde des Tages, also dem, was man tatsächlich bekommen hat.
--
-- „Erste Runde" ist dieselbe Definition wie in `is_repeated_daily`: die
-- früheste Daily-Runde des Berliner Kalendertages.
-- =============================================================================

create or replace function public.get_my_daily_result_today()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with paid as (
    select s.id, s.xp_earned
    from public.quiz_sessions s
    where s.user_id = auth.uid()
      and s.session_type = 'daily'
      and (s.started_at at time zone 'Europe/Berlin')::date = public.daily_quiz_day()
    order by s.started_at, s.id
    limit 1
  )
  select jsonb_build_object(
    'session_id', paid.id,
    'xp_earned', paid.xp_earned,
    'answered', (select count(*) from public.quiz_attempts a where a.quiz_session_id = paid.id),
    'correct', (select count(*) from public.quiz_attempts a where a.quiz_session_id = paid.id and a.is_correct)
  )
  from paid;
$$;

grant execute on function public.get_my_daily_result_today() to authenticated;
