-- =============================================================================
-- QuizByte – nur abgeschlossene Daily-Runden zählen
--
-- `003400` hat leere Runden ausgeschlossen, aber eine abgebrochene Runde mit
-- zwei Antworten beanspruchte den Tag weiterhin: die danach zu Ende gespielte
-- Runde galt als Wiederholung, zahlte nichts, und die Auswertung zeigte das
-- Ergebnis des Abbruchs („2 von 2 richtig").
--
-- Ab jetzt zählt der Tag als gespielt, sobald eine Runde **abgeschlossen** ist.
-- Wer abbricht, darf neu anfangen; missbrauchen lässt sich das nicht, weil eine
-- Frage ohnehin nur beim ersten Mal richtig XP zahlt.
-- =============================================================================

/** True, wenn vor dieser Runde am selben Tag schon eine Daily-Runde beendet wurde. */
create or replace function public.is_repeated_daily(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quiz_sessions this
    join public.quiz_sessions other
      on other.user_id = this.user_id
     and other.session_type = 'daily'
     and other.id <> this.id
     and other.completed_at is not null
     and (other.started_at at time zone 'Europe/Berlin')::date
         = (this.started_at at time zone 'Europe/Berlin')::date
     and (other.started_at < this.started_at
          or (other.started_at = this.started_at and other.id < this.id))
    where this.id = p_session_id
      and this.session_type = 'daily'
  );
$$;

/** Ergebnis der bezahlten Daily-Runde: der frühesten abgeschlossenen des Tages. */
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
      and s.completed_at is not null
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
    'max_xp', (scored.reachable + public.xp_for_session_completion()) * 2
  )
  from paid, scored;
$$;
