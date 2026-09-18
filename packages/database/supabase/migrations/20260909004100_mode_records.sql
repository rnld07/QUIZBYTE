-- =============================================================================
-- QuizByte – Bestwerte je Spielmodus
--
-- Damit die Ergebnisseite eines Modus sagen kann, ob das gerade ein Rekord war.
-- Was als Bestwert zaehlt, entscheidet der Modus:
--   blitz     – die meisten richtigen Antworten in einer Runde
--   survival  – die meisten beantworteten Fragen, also wie weit man kam
--   perfect   – die Anzahl der Runden, die bis zum Ende perfekt liefen
--   classic   – nichts Besonderes, aber die Zahlen stehen trotzdem bereit
--
-- `p_exclude_session` laesst die gerade gespielte Runde aussen vor. Ohne das
-- waere der eigene Lauf immer schon Teil des Bestwerts, und ein neuer Rekord
-- liesse sich nicht mehr von einem eingestellten unterscheiden.
--
-- Gerechnet statt mitgefuehrt: Bestwerte werden selten gebraucht, und ein
-- weiterer Zaehler im Trigger waere eine weitere Stelle, die auseinanderlaeuft.
-- =============================================================================

create or replace function public.get_my_mode_records(p_exclude_session uuid default null)
returns table (
  mode public.quiz_mode,
  rounds integer,
  best_correct integer,
  best_answered integer,
  perfect_rounds integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with rounds as (
    select
      s.mode,
      s.total_questions,
      (select count(*) from public.quiz_attempts a where a.quiz_session_id = s.id) as answered,
      (select count(*) from public.quiz_attempts a where a.quiz_session_id = s.id and a.is_correct) as correct
    from public.quiz_sessions s
    where s.user_id = auth.uid()
      and s.completed_at is not null
      and (p_exclude_session is null or s.id <> p_exclude_session)
  )
  select
    r.mode,
    count(*)::integer,
    coalesce(max(r.correct), 0)::integer,
    coalesce(max(r.answered), 0)::integer,
    count(*) filter (where r.answered > 0 and r.correct = r.total_questions)::integer
  from rounds r
  group by r.mode;
$$;

comment on function public.get_my_mode_records(uuid) is
  'Personal bests per quiz mode. Pass the current session to leave it out of the comparison.';

grant execute on function public.get_my_mode_records(uuid) to authenticated;
