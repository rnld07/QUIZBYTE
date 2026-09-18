-- =============================================================================
-- QuizByte – XP im Duell
--
-- Eine Duellrunde zahlt das 1,5-Fache pro richtiger Antwort, der Sieger bekommt
-- zusätzlich einen Bonus (siehe `settle_duel`). Bei Gleichstand gibt es keinen.
--
-- Die Regel „eine Frage zahlt nur beim ersten Mal richtig" gilt auch hier: sonst
-- ließe sich XP durch wiederholte Duelle über dieselben Fragen erzeugen.
--
-- Gegenstück in `packages/shared/src/config/xp.ts`: DUEL_XP_MULTIPLIER, DUEL_WIN_XP.
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

  -- Only the first correct answer to a question pays out.
  select exists (
    select 1 from public.quiz_attempts a
    where a.question_id = new.question_id and a.user_id = new.user_id and a.is_correct
  ) into v_already_correct;

  if not new.is_correct or v_already_correct or public.is_repeated_daily(v_session.id) then
    v_xp := 0;
  else
    v_xp := public.xp_for_answer(true, v_difficulty);
    if v_session.session_type = 'daily' then
      v_xp := v_xp * 2;
    elsif v_session.session_type = 'duel' then
      v_xp := round(v_xp * 1.5);
    end if;
  end if;

  new.xp_earned := v_xp;
  return new;
end;
$$;
