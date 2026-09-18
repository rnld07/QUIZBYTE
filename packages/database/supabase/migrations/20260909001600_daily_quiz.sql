-- =============================================================================
-- QuizByte – Daily Quiz und feinere XP-Regel
--
-- XP-Regel neu:
--   Eine Frage zahlt XP für die **erste richtige** Antwort. Wer sie vorher
--   falsch hatte und sie jetzt richtig beantwortet, bekommt also XP – wer sie
--   schon einmal richtig hatte, nicht mehr.
--
-- Daily Quiz: Sessions vom Typ 'daily' geben doppelte XP, auch beim Abschluss.
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

  if new.is_correct and not v_already_correct then
    v_xp := public.xp_for_answer(true, v_difficulty);
    if v_session.session_type = 'daily' then
      v_xp := v_xp * 2;
    end if;
  else
    v_xp := 0;
  end if;

  new.xp_earned := v_xp;
  return new;
end;
$$;

-- Abschlussbonus: beim Daily Quiz ebenfalls doppelt ------------------------------------

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
    v_bonus := public.xp_for_session_completion();
    if v_session.session_type = 'daily' then
      v_bonus := v_bonus * 2;
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

-- Hat der Nutzer heute schon ein Daily Quiz abgeschlossen? -----------------------------

create or replace function public.completed_daily_quiz_today(p_today date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.quiz_sessions s
    where s.user_id = auth.uid()
      and s.session_type = 'daily'
      and s.completed_at is not null
      -- Compared against the caller's local day, like the streak.
      and (s.completed_at at time zone 'utc')::date between p_today - 1 and p_today + 1
      and exists (
        select 1 from public.quiz_attempts a
        where a.quiz_session_id = s.id and a.answered_on = p_today
      )
  );
$$;

grant execute on function public.completed_daily_quiz_today(date) to authenticated;
