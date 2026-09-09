-- =============================================================================
-- QuizByte – user progress, quiz sessions and attempts
--
-- Design:
--   * user_progress is NEVER written by clients. It is maintained by triggers
--     and SECURITY DEFINER functions so XP / streak values are trustworthy.
--   * quiz_attempts are inserted by clients, but is_correct and xp_earned are
--     computed server-side (the client-sent values are ignored).
--   * The XP values must match packages/shared/src/config/xp.ts.
-- =============================================================================

-- XP rules (single place in the database) -------------------------------------------

create or replace function public.xp_for_answer(p_is_correct boolean)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_is_correct then 10 else 2 end;
$$;

create or replace function public.xp_for_session_completion()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 10;
$$;

comment on function public.xp_for_answer(boolean) is 'XP per answer. Keep in sync with xpConfig in packages/shared.';
comment on function public.xp_for_session_completion() is 'Bonus XP per completed session. Keep in sync with xpConfig in packages/shared.';

-- user_progress -------------------------------------------------------------------------

create table public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_date date,
  total_questions_answered integer not null default 0 check (total_questions_answered >= 0),
  total_correct_answers integer not null default 0 check (total_correct_answers >= 0),
  total_sessions_completed integer not null default 0 check (total_sessions_completed >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.user_progress is 'Aggregated progress per user. Level is derived from total_xp in the app, never stored.';

create trigger user_progress_set_updated_at
  before update on public.user_progress
  for each row execute function public.set_updated_at();

alter table public.user_progress enable row level security;

create policy "user_progress: users read own progress"
  on public.user_progress for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_progress: admins read all"
  on public.user_progress for select
  to authenticated
  using (public.is_admin());

grant select on public.user_progress to authenticated;

-- quiz_sessions ---------------------------------------------------------------------------

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  session_type public.session_type not null default 'category',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_questions integer not null check (total_questions between 1 and 100),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  created_at timestamptz not null default now()
);

comment on table public.quiz_sessions is 'One quiz round. completed_at is set by complete_quiz_session().';

create index quiz_sessions_user_idx on public.quiz_sessions (user_id, started_at desc);

alter table public.quiz_sessions enable row level security;

create policy "quiz_sessions: users read own sessions"
  on public.quiz_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "quiz_sessions: users create own sessions"
  on public.quiz_sessions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and completed_at is null
    and correct_answers = 0
    and xp_earned = 0
  );

create policy "quiz_sessions: admins read all"
  on public.quiz_sessions for select
  to authenticated
  using (public.is_admin());

grant select, insert on public.quiz_sessions to authenticated;

-- quiz_attempts -------------------------------------------------------------------------------

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  quiz_session_id uuid not null references public.quiz_sessions (id) on delete cascade,
  selected_answer public.answer_key not null,
  is_correct boolean not null default false,
  response_time_ms integer not null default 0 check (response_time_ms between 0 and 3600000),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  -- The user's LOCAL calendar date. Drives the streak; validated against server time.
  answered_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  -- A question can be answered only once per session. Makes offline retries idempotent.
  constraint quiz_attempts_unique_per_session unique (quiz_session_id, question_id)
);

comment on table public.quiz_attempts is 'Every answered question. is_correct and xp_earned are computed by trigger.';

create index quiz_attempts_user_created_idx on public.quiz_attempts (user_id, created_at desc);
create index quiz_attempts_question_idx on public.quiz_attempts (question_id);
create index quiz_attempts_session_idx on public.quiz_attempts (quiz_session_id);

alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts: users read own attempts"
  on public.quiz_attempts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "quiz_attempts: users create own attempts"
  on public.quiz_attempts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "quiz_attempts: admins read all"
  on public.quiz_attempts for select
  to authenticated
  using (public.is_admin());

grant select, insert on public.quiz_attempts to authenticated;

-- Streak logic (mirrors applyStreakActivity() in packages/shared) -----------------------------

create or replace function public.apply_streak(
  p_current_streak integer,
  p_longest_streak integer,
  p_last_active_date date,
  p_today date,
  out current_streak integer,
  out longest_streak integer,
  out last_active_date date
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  diff integer;
begin
  if p_last_active_date is null then
    current_streak := 1;
    longest_streak := greatest(p_longest_streak, 1);
    last_active_date := p_today;
    return;
  end if;

  diff := p_today - p_last_active_date;

  if diff <= 0 then
    current_streak := p_current_streak;
    longest_streak := greatest(p_longest_streak, p_current_streak);
    last_active_date := p_last_active_date;
  elsif diff = 1 then
    current_streak := p_current_streak + 1;
    longest_streak := greatest(p_longest_streak, p_current_streak + 1);
    last_active_date := p_today;
  else
    current_streak := 1;
    longest_streak := greatest(p_longest_streak, 1);
    last_active_date := p_today;
  end if;
end;
$$;

-- Attempt validation + scoring (BEFORE INSERT) ---------------------------------------------------

create or replace function public.score_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correct public.answer_key;
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

  select correct_answer into v_correct
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
  new.xp_earned := public.xp_for_answer(new.is_correct);
  return new;
end;
$$;

create trigger quiz_attempts_score
  before insert on public.quiz_attempts
  for each row execute function public.score_quiz_attempt();

-- Progress aggregation (AFTER INSERT) -------------------------------------------------------------

create or replace function public.apply_quiz_attempt_to_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_progress public.user_progress%rowtype;
  v_streak record;
begin
  select * into v_progress from public.user_progress where user_id = new.user_id for update;
  if not found then
    insert into public.user_progress (user_id) values (new.user_id)
    returning * into v_progress;
  end if;

  select * into v_streak from public.apply_streak(
    v_progress.current_streak,
    v_progress.longest_streak,
    v_progress.last_active_date,
    new.answered_on
  );

  update public.user_progress
  set
    total_xp = total_xp + new.xp_earned,
    total_questions_answered = total_questions_answered + 1,
    total_correct_answers = total_correct_answers + (case when new.is_correct then 1 else 0 end),
    current_streak = v_streak.current_streak,
    longest_streak = v_streak.longest_streak,
    last_active_date = v_streak.last_active_date
  where user_id = new.user_id;

  update public.quiz_sessions
  set
    correct_answers = correct_answers + (case when new.is_correct then 1 else 0 end),
    xp_earned = xp_earned + new.xp_earned
  where id = new.quiz_session_id;

  return new;
end;
$$;

create trigger quiz_attempts_apply_progress
  after insert on public.quiz_attempts
  for each row execute function public.apply_quiz_attempt_to_progress();

-- Session completion (RPC) -----------------------------------------------------------------------

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

grant execute on function public.complete_quiz_session(uuid) to authenticated;

-- Reset own progress (settings screen) ------------------------------------------------------------

create or replace function public.reset_my_progress()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  delete from public.quiz_attempts where user_id = v_user;
  delete from public.quiz_sessions where user_id = v_user;
  update public.user_progress
  set total_xp = 0,
      current_streak = 0,
      longest_streak = 0,
      last_active_date = null,
      total_questions_answered = 0,
      total_correct_answers = 0,
      total_sessions_completed = 0
  where user_id = v_user;
end;
$$;

grant execute on function public.reset_my_progress() to authenticated;

-- Auth hooks (need user_progress to exist, hence created here) --------------------------------------

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_updated
  after update of is_anonymous on auth.users
  for each row execute function public.handle_user_updated();
