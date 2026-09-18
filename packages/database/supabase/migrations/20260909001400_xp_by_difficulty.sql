-- =============================================================================
-- QuizByte – XP nach Schwierigkeit, keine XP für falsche Antworten
--
-- Neu:
--   * falsche Antwort  → 0 XP (vorher 2)
--   * richtige Antwort → 8 / 12 / 18 XP je nach leicht / mittel / schwer
--
-- Muss mit `xpConfig` in packages/shared/src/config/xp.ts übereinstimmen.
-- =============================================================================

-- Die alte Signatur wird nicht mehr benutzt; der Trigger unten ruft die neue.
create or replace function public.xp_for_answer(
  p_is_correct boolean,
  p_difficulty public.difficulty_level default 'medium'
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when not p_is_correct then 0
    when p_difficulty = 'easy' then 8
    when p_difficulty = 'hard' then 18
    else 12
  end;
$$;

comment on function public.xp_for_answer(boolean, public.difficulty_level) is
  'XP per answer: 0 when wrong, 8/12/18 by difficulty. Keep in sync with xpConfig in packages/shared.';

-- Scoring-Trigger: reicht die Schwierigkeit der Frage mit durch ------------------------

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
  new.xp_earned := public.xp_for_answer(new.is_correct, v_difficulty);
  return new;
end;
$$;

-- Die einargumentige Variante entfällt, damit es nur eine Quelle der Wahrheit gibt.
drop function if exists public.xp_for_answer(boolean);
