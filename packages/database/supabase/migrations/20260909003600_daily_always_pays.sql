-- =============================================================================
-- QuizByte – im Daily zählt jede richtige Antwort
--
-- Bisher galt auch hier: eine Frage zahlt nur beim allerersten Mal richtig.
-- Beim Daily geht diese Regel daneben – die fünf Fragen sucht der Server aus,
-- man kann ihnen nicht ausweichen. Wer sie zufällig schon kannte, spielte eine
-- volle Runde für 0 XP, und das doppelte XP-Versprechen war wertlos.
--
-- Ab jetzt zahlt im Daily jede richtige Antwort. Farmen lässt sich das nicht:
-- Es gibt pro Tag genau einen bezahlten Durchlauf (`is_repeated_daily`), und
-- die Fragen des Tages stehen fest.
--
-- In allen anderen Rundenarten bleibt es dabei, dass eine bereits richtig
-- beantwortete Frage nichts mehr bringt – dort wählt man die Fragen selbst.
-- =============================================================================

create or replace function public.score_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correct public.answer_key;
  v_difficulty public.difficulty_level;
  v_session public.quiz_sessions%rowtype;
  v_already_correct boolean;
  v_is_daily boolean;
  v_xp integer;
  v_server_date date := (now() at time zone 'utc')::date;
begin
  select * into v_session from public.quiz_sessions where id = new.quiz_session_id;
  if not found then
    raise exception 'quiz session not found' using errcode = 'foreign_key_violation';
  end if;
  if v_session.user_id <> new.user_id then
    raise exception 'attempt user does not match session user' using errcode = 'insufficient_privilege';
  end if;
  if v_session.completed_at is not null then
    raise exception 'quiz session is already completed' using errcode = 'check_violation';
  end if;

  select correct_answer, difficulty into v_correct, v_difficulty
  from public.questions
  where id = new.question_id and status = 'published';
  if not found then
    raise exception 'question is not available' using errcode = 'foreign_key_violation';
  end if;

  -- Local dates can legitimately differ from UTC by at most one day.
  if new.answered_on < v_server_date - 1 or new.answered_on > v_server_date + 1 then
    new.answered_on := v_server_date;
  end if;

  new.is_correct := (new.selected_answer = v_correct);
  v_is_daily := (v_session.session_type = 'daily');

  select exists (
    select 1 from public.quiz_attempts a
    where a.question_id = new.question_id and a.user_id = new.user_id and a.is_correct
  ) into v_already_correct;

  if not new.is_correct or (v_already_correct and not v_is_daily) or public.is_repeated_daily(v_session.id) then
    v_xp := 0;
  else
    v_xp := public.xp_for_answer(true, v_difficulty);
    if v_is_daily then
      v_xp := v_xp * 2;
    elsif v_session.session_type = 'duel' then
      v_xp := round(v_xp * 1.5);
    end if;
  end if;

  new.xp_earned := v_xp;
  return new;
end;
$$;

/**
 * Das erreichbare Maximum des Tages.
 *
 * Ohne die Ausnahme für bereits Bekanntes: im Daily zahlt jede richtige Antwort,
 * also ist auch alles erreichbar.
 */
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
      coalesce(sum(public.xp_for_answer(true, q.difficulty)), 0) as reachable
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
