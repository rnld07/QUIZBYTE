-- =============================================================================
-- QuizByte – erreichbare XP der bezahlten Daily-Runde
--
-- Der Balken zeigte „100 von 144 XP", obwohl alle fünf Fragen richtig waren.
-- Grund: 144 war das theoretische Maximum, aber eine Frage, die man früher
-- schon einmal richtig hatte, zahlt nie wieder – diese XP waren gar nicht
-- erreichbar.
--
-- Deshalb liefert die Funktion jetzt zusätzlich `max_xp`: die Summe über alle
-- Versuche, wobei eine richtige Antwort mit 0 XP als „konnte nicht zahlen"
-- gilt und aus dem Maximum fällt. Falsch beantwortete Fragen zählen voll –
-- diese XP hat man tatsächlich liegen lassen.
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
  ),
  scored as (
    select
      count(*) as answered,
      count(*) filter (where a.is_correct) as correct,
      coalesce(
        sum(
          case
            when a.is_correct and a.xp_earned = 0 then 0
            else public.xp_for_answer(true, q.difficulty)
          end
        ),
        0
      ) as reachable
    from paid
    join public.quiz_attempts a on a.quiz_session_id = paid.id
    join public.questions q on q.id = a.question_id
  )
  select jsonb_build_object(
    'session_id', paid.id,
    'xp_earned', paid.xp_earned,
    'answered', scored.answered,
    'correct', scored.correct,
    -- Das Daily verdoppelt Antworten und Abschlussbonus.
    'max_xp', (scored.reachable + public.xp_for_session_completion()) * 2
  )
  from paid, scored;
$$;

grant execute on function public.get_my_daily_result_today() to authenticated;
