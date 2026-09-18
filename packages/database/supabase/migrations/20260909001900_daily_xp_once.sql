-- =============================================================================
-- QuizByte – XP im Daily Quiz nur beim ersten Durchlauf
--
-- Bisher hing die Sperre daran, dass die erste Tagesrunde bereits *abgeschlossen*
-- war. Wer die erste Runde abbrach und neu startete, bekam erneut XP.
--
-- Neu: XP zahlt ausschließlich die **früheste** Daily-Runde des Tages. Jede
-- weitere Runde desselben Tages – abgeschlossen oder nicht – gibt 0 XP und
-- keinen Abschlussbonus. Der Tag ist der Berliner Kalendertag der Runde, damit
-- eine um 23:58 gestartete Runde nicht plötzlich zum Folgetag zählt.
-- =============================================================================

/** True, wenn vor dieser Runde am selben Tag schon eine Daily-Runde lief. */
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
     and (other.started_at at time zone 'Europe/Berlin')::date
         = (this.started_at at time zone 'Europe/Berlin')::date
     and (other.started_at < this.started_at
          or (other.started_at = this.started_at and other.id < this.id))
    where this.id = p_session_id
      and this.session_type = 'daily'
  );
$$;

grant execute on function public.is_repeated_daily(uuid) to authenticated;

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
    end if;
  end if;

  new.xp_earned := v_xp;
  return new;
end;
$$;

create or replace function public.complete_quiz_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.quiz_sessions%rowtype;
  v_progress public.user_progress%rowtype;
  v_answered integer;
  v_bonus integer := 0;
begin
  select * into v_session from public.quiz_sessions where id = p_session_id for update;
  if not found or v_session.user_id <> auth.uid() then
    raise exception 'quiz session not found' using errcode = 'no_data_found';
  end if;

  select count(*) into v_answered from public.quiz_attempts where quiz_session_id = p_session_id;

  if v_session.completed_at is null then
    if v_answered = 0 then
      raise exception 'cannot complete a session without answers' using errcode = 'check_violation';
    end if;

    -- A repeated daily round finishes without any payout.
    if not public.is_repeated_daily(p_session_id) then
      v_bonus := public.xp_for_session_completion();
      if v_session.session_type = 'daily' then
        v_bonus := v_bonus * 2;
      end if;
    end if;

    update public.quiz_sessions
    set completed_at = now(), xp_earned = xp_earned + v_bonus
    where id = p_session_id
    returning * into v_session;

    update public.user_progress
    set total_xp = total_xp + v_bonus,
        total_sessions_completed = total_sessions_completed + 1
    where user_id = v_session.user_id;
  end if;

  select * into v_progress from public.user_progress where user_id = v_session.user_id;

  return jsonb_build_object(
    'session', to_jsonb(v_session),
    'progress', to_jsonb(v_progress),
    'answered_questions', v_answered,
    'completion_bonus_xp', v_bonus
  );
end;
$$;
