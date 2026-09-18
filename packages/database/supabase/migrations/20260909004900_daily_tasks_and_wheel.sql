-- =============================================================================
-- QuizByte – Tagesaufgaben und Glücksrad
--
-- Neben dem Daily Quiz gibt es drei Aufgaben pro Tag. Sie werden nicht
-- mitgeschrieben, waehrend man spielt: jede ist eine Zahl, die sich aus den
-- Versuchen und Runden des Tages ohnehin ergibt. Gespeichert wird nur, was
-- schon abgeholt wurde – eine Aufgabe zahlt einmal.
--
-- Welche drei ein Tag stellt, entscheidet der Tag selbst (Hash ueber das
-- Datum). Damit sieht jeder dieselben drei, und morgen sind es andere.
--
-- Wer das Daily Quiz fehlerfrei spielt, darf einmal am Rad drehen: 0 bis 100 XP,
-- mit klarem Schwerpunkt auf 5 bis 30. Gezogen wird hier, nicht im Client –
-- XP vergibt immer der Server.
-- =============================================================================

/** Was eine Tagesaufgabe zahlt. Muss zu DAILY_TASK_DEFINITIONS in packages/shared passen. */
create or replace function public.daily_task_xp(p_key text)
returns integer
language sql
immutable
as $$
  select case p_key
    when 'answer_questions' then 25
    when 'correct_answers' then 30
    when 'finish_sessions' then 25
    when 'play_daily' then 20
    when 'perfect_round' then 35
    when 'blitz_round' then 25
    else 0
  end;
$$;

/** Wie viel eine Aufgabe verlangt. Ebenfalls gespiegelt in packages/shared. */
create or replace function public.daily_task_target(p_key text)
returns integer
language sql
immutable
as $$
  select case p_key
    when 'answer_questions' then 15
    when 'correct_answers' then 10
    when 'finish_sessions' then 3
    else 1
  end;
$$;

/**
 * Die drei Aufgaben des Tages.
 *
 * Aus dem Datum abgeleitet, nicht gewuerfelt: derselbe Tag ergibt immer
 * dieselben drei, egal wie oft gefragt wird.
 */
create or replace function public.daily_task_keys(p_day date)
returns text[]
language sql
immutable
as $$
  select array(
    select k
    from unnest(array[
      'answer_questions', 'correct_answers', 'finish_sessions',
      'play_daily', 'perfect_round', 'blitz_round'
    ]) as k
    order by md5(k || p_day::text)
    limit 3
  );
$$;

grant execute on function public.daily_task_xp(text) to authenticated;
grant execute on function public.daily_task_target(text) to authenticated;
grant execute on function public.daily_task_keys(date) to authenticated;

-- Was schon abgeholt wurde --------------------------------------------------------------

create table public.daily_task_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_day date not null,
  task_key text not null,
  xp_awarded integer not null check (xp_awarded >= 0),
  claimed_at timestamptz not null default now(),
  primary key (user_id, quiz_day, task_key)
);

comment on table public.daily_task_claims is 'Eine erledigte Tagesaufgabe zahlt genau einmal.';

alter table public.daily_task_claims enable row level security;

create policy "daily_task_claims: own rows"
  on public.daily_task_claims for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.daily_task_claims to authenticated;

create table public.daily_wheel_spins (
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_day date not null,
  xp_awarded integer not null check (xp_awarded between 0 and 100),
  spun_at timestamptz not null default now(),
  primary key (user_id, quiz_day)
);

comment on table public.daily_wheel_spins is 'Eine Drehung pro Tag, nach einem fehlerfreien Daily Quiz.';

alter table public.daily_wheel_spins enable row level security;

create policy "daily_wheel_spins: own rows"
  on public.daily_wheel_spins for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.daily_wheel_spins to authenticated;

-- Fortschritt des Tages -----------------------------------------------------------------

/**
 * Wie weit eine Aufgabe heute gediehen ist.
 *
 * Alles aus `quiz_attempts` und `quiz_sessions` des Berliner Quiztages – es
 * gibt keinen zweiten Zaehler, der auseinanderlaufen koennte.
 */
create or replace function public.daily_task_progress(p_key text, p_day date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case p_key
    when 'answer_questions' then (
      select count(*)::integer from public.quiz_attempts a
      join public.quiz_sessions s on s.id = a.quiz_session_id
      where a.user_id = auth.uid()
        and (s.started_at at time zone 'Europe/Berlin')::date = p_day
    )
    when 'correct_answers' then (
      select count(*)::integer from public.quiz_attempts a
      join public.quiz_sessions s on s.id = a.quiz_session_id
      where a.user_id = auth.uid() and a.is_correct
        and (s.started_at at time zone 'Europe/Berlin')::date = p_day
    )
    when 'finish_sessions' then (
      select count(*)::integer from public.quiz_sessions s
      where s.user_id = auth.uid() and s.completed_at is not null
        and (s.started_at at time zone 'Europe/Berlin')::date = p_day
    )
    when 'play_daily' then (
      select least(1, count(*))::integer from public.quiz_sessions s
      where s.user_id = auth.uid() and s.session_type = 'daily' and s.completed_at is not null
        and (s.started_at at time zone 'Europe/Berlin')::date = p_day
    )
    when 'blitz_round' then (
      select least(1, count(*))::integer from public.quiz_sessions s
      where s.user_id = auth.uid() and s.mode = 'blitz' and s.completed_at is not null
        and (s.started_at at time zone 'Europe/Berlin')::date = p_day
    )
    when 'perfect_round' then (
      -- Fehlerfrei heisst: mindestens eine Antwort und keine falsche.
      select least(1, count(*))::integer from public.quiz_sessions s
      where s.user_id = auth.uid() and s.completed_at is not null
        and (s.started_at at time zone 'Europe/Berlin')::date = p_day
        and exists (select 1 from public.quiz_attempts a where a.quiz_session_id = s.id)
        and not exists (select 1 from public.quiz_attempts a where a.quiz_session_id = s.id and not a.is_correct)
    )
    else 0
  end;
$$;

grant execute on function public.daily_task_progress(text, date) to authenticated;

/** Die drei Aufgaben von heute mit Stand und Status. */
create or replace function public.get_my_daily_tasks()
returns table (
  task_key text,
  target integer,
  progress integer,
  xp integer,
  claimed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    k,
    public.daily_task_target(k),
    least(public.daily_task_progress(k, public.daily_quiz_day()), public.daily_task_target(k)),
    public.daily_task_xp(k),
    exists (
      select 1 from public.daily_task_claims c
      where c.user_id = auth.uid() and c.quiz_day = public.daily_quiz_day() and c.task_key = k
    )
  from unnest(public.daily_task_keys(public.daily_quiz_day())) as k;
$$;

grant execute on function public.get_my_daily_tasks() to authenticated;

/**
 * Holt die XP einer erledigten Aufgabe ab.
 *
 * Der Eintrag in `daily_task_claims` ist die Sperre: sein Primaerschluessel
 * laesst denselben Tag und dieselbe Aufgabe kein zweites Mal zu, auch wenn zwei
 * Anfragen gleichzeitig kommen.
 */
create or replace function public.claim_daily_task(p_key text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := public.daily_quiz_day();
  v_xp integer := public.daily_task_xp(p_key);
  v_claimed integer;
begin
  if not (p_key = any (public.daily_task_keys(v_day))) then
    raise exception 'not a task of today' using errcode = 'check_violation';
  end if;
  if public.daily_task_progress(p_key, v_day) < public.daily_task_target(p_key) then
    raise exception 'task not finished' using errcode = 'check_violation';
  end if;

  insert into public.daily_task_claims (user_id, quiz_day, task_key, xp_awarded)
  values (auth.uid(), v_day, p_key, v_xp)
  on conflict (user_id, quiz_day, task_key) do nothing
  returning xp_awarded into v_claimed;

  -- Schon abgeholt: nichts zahlen, nichts melden.
  if v_claimed is null then
    return 0;
  end if;

  update public.user_progress set total_xp = total_xp + v_xp where user_id = auth.uid();
  return v_xp;
end;
$$;

grant execute on function public.claim_daily_task(text) to authenticated;

-- Glücksrad -----------------------------------------------------------------------------

/** True, wenn das heutige Daily Quiz ohne Fehler beendet wurde. */
create or replace function public.daily_quiz_was_perfect()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.quiz_sessions s
    where s.user_id = auth.uid()
      and s.session_type = 'daily'
      and s.completed_at is not null
      and (s.started_at at time zone 'Europe/Berlin')::date = public.daily_quiz_day()
      and exists (select 1 from public.quiz_attempts a where a.quiz_session_id = s.id)
      and not exists (select 1 from public.quiz_attempts a where a.quiz_session_id = s.id and not a.is_correct)
  );
$$;

grant execute on function public.daily_quiz_was_perfect() to authenticated;

/** Der Stand des Rades: ob es bereitsteht und was es gegebenenfalls ergeben hat. */
create or replace function public.get_my_daily_wheel()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'available', public.daily_quiz_was_perfect(),
    'xp_won', (
      select w.xp_awarded from public.daily_wheel_spins w
      where w.user_id = auth.uid() and w.quiz_day = public.daily_quiz_day()
    )
  );
$$;

grant execute on function public.get_my_daily_wheel() to authenticated;

/**
 * Dreht das Rad – einmal pro Tag, und nur nach einem fehlerfreien Daily Quiz.
 *
 * Die Gewichte spiegeln WHEEL_SEGMENTS in packages/shared: knapp neun von zehn
 * Drehungen landen zwischen 5 und 30 XP.
 */
create or replace function public.spin_daily_wheel()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := public.daily_quiz_day();
  v_roll integer;
  v_xp integer;
  v_awarded integer;
begin
  if not public.daily_quiz_was_perfect() then
    raise exception 'daily quiz was not perfect' using errcode = 'check_violation';
  end if;

  -- 1 bis 100, passend zu den Gewichten unten (Summe 100).
  v_roll := floor(random() * 100)::integer + 1;
  v_xp := case
    when v_roll <= 3 then 0     -- 3 %
    when v_roll <= 17 then 5    -- 14 %
    when v_roll <= 35 then 10   -- 18 %
    when v_roll <= 53 then 15   -- 18 %
    when v_roll <= 68 then 20   -- 15 %
    when v_roll <= 80 then 25   -- 12 %
    when v_roll <= 90 then 30   -- 10 %
    when v_roll <= 97 then 50   -- 7 %
    else 100                    -- 3 %
  end;

  insert into public.daily_wheel_spins (user_id, quiz_day, xp_awarded)
  values (auth.uid(), v_day, v_xp)
  on conflict (user_id, quiz_day) do nothing
  returning xp_awarded into v_awarded;

  -- Heute schon gedreht: das alte Ergebnis zurueckgeben, nichts nachzahlen.
  if v_awarded is null then
    select w.xp_awarded into v_awarded from public.daily_wheel_spins w
    where w.user_id = auth.uid() and w.quiz_day = v_day;
    return v_awarded;
  end if;

  if v_xp > 0 then
    update public.user_progress set total_xp = total_xp + v_xp where user_id = auth.uid();
  end if;
  return v_xp;
end;
$$;

grant execute on function public.spin_daily_wheel() to authenticated;
