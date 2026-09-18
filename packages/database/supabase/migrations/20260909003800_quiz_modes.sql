-- =============================================================================
-- QuizByte – Spielmodi
--
-- Eine Runde hat ab jetzt neben ihrer Art (Kategorie, Random, Daily …) auch
-- einen Modus, der bestimmt, wie gespielt wird:
--
--   classic   – normales Quiz, 10 Fragen
--   blitz     – 60 Sekunden, so viele Fragen wie möglich
--   survival  – 3 Leben, spielen bis man raus ist
--   perfect   – ein Fehler und die Runde ist vorbei
--
-- Der Modus ändert nichts an den XP: bezahlt wird weiter pro richtiger Antwort.
-- Er ändert nur, wie viele Fragen gezogen werden und wann die Runde endet.
--
-- Gegenstück in `packages/shared/src/domain/quiz/modes.ts` – die Fragenzahlen
-- der Duelle stehen dort in `duelQuestionCount` und muessen hier gleich bleiben.
-- =============================================================================

create type public.quiz_mode as enum ('classic', 'blitz', 'survival', 'perfect');

-- Bestehende Runden sind klassische Runden; deshalb ein Default statt einer
-- Datenwanderung.
alter table public.quiz_sessions
  add column mode public.quiz_mode not null default 'classic';

comment on column public.quiz_sessions.mode is 'Wie gespielt wurde. Keep in sync with QUIZ_MODES in packages/shared.';

alter table public.duels
  add column mode public.quiz_mode not null default 'classic';

comment on column public.duels.mode is 'Beide Seiten eines Duells spielen denselben Modus.';

/**
 * Beim Abschluss zaehlt, was wirklich gespielt wurde.
 *
 * Blitz, Survival und die perfekte Runde enden vorzeitig – die Runde wird aber
 * mit ihrer geplanten Laenge angelegt, weil beim Start niemand weiss, wie weit
 * man kommt. Bliebe die stehen, laese das Ergebnis "4 von 30", und eine
 * perfekte Runde wuerde nie als perfekt gezaehlt.
 *
 * Fuer klassische Runden aendert sich dadurch nichts: dort ist beides gleich.
 */
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
    set completed_at = now(),
        xp_earned = xp_earned + v_bonus,
        total_questions = least(total_questions, greatest(v_answered, 1))
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

-- Duelle mit Modus ---------------------------------------------------------------------

/** Wie viele Fragen ein Duell in diesem Modus zieht. */
create or replace function public.duel_question_count(p_mode public.quiz_mode)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_mode
    when 'blitz' then 20
    when 'survival' then 20
    else 5
  end;
$$;

comment on function public.duel_question_count(public.quiz_mode) is
  'Questions per duel round. Keep in sync with duelQuestionCount in packages/shared.';

grant execute on function public.duel_question_count(public.quiz_mode) to authenticated;

-- Die einarmige Fassung faellt weg, damit es keine zwei Ueberladungen gibt, bei
-- denen der Client die falsche erwischt. Mit dem Drop verschwinden auch ihre
-- Rechte.
drop function if exists public.create_duel(uuid);

/**
 * Fordert einen Freund heraus – im gewaehlten Modus.
 *
 * Beide bekommen dieselben Fragen in derselben Reihenfolge: nur so ist das
 * Ergebnis vergleichbar. Wie viele es sind, haengt am Modus – in Blitz und
 * Survival waere man mit fuenf Fragen sofort durch, bevor die Zeit oder die
 * Leben ueberhaupt greifen koennen.
 */
create or replace function public.create_duel(p_friend_id uuid, p_mode public.quiz_mode default 'classic')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_questions uuid[];
  v_wanted integer := public.duel_question_count(p_mode);
  v_id uuid;
begin
  if not public.are_friends(p_friend_id, auth.uid()) then
    raise exception 'not friends' using errcode = 'insufficient_privilege';
  end if;

  select array_agg(q.id) into v_questions
  from (
    select q.id
    from public.questions q
    join public.categories c on c.id = q.category_id
    where q.status = 'published'
      and c.is_active = true
      and q.requires_pro = false
      and c.requires_pro = false
    order by random()
    limit v_wanted
  ) q;

  -- Fuer die offenen Modi reicht auch weniger als die Wunschzahl, solange beide
  -- dasselbe bekommen; nur ganz ohne Fragen geht es nicht.
  if v_questions is null or array_length(v_questions, 1) < least(v_wanted, 5) then
    raise exception 'not enough questions for a duel' using errcode = 'no_data_found';
  end if;

  insert into public.duels (challenger_id, opponent_id, question_ids, mode)
  values (auth.uid(), p_friend_id, v_questions, p_mode)
  returning id into v_id;

  insert into public.friend_messages (sender_id, recipient_id, kind, duel_id)
  values (auth.uid(), p_friend_id, 'duel', v_id);

  return v_id;
end;
$$;

grant execute on function public.create_duel(uuid, public.quiz_mode) to authenticated;

/** Wie bisher, nur mit dem Modus im Duell-Block – der Chat schreibt ihn an. */
create or replace function public.get_conversation(p_friend_id uuid, p_limit integer default 100)
returns table (
  id uuid,
  sender_id uuid,
  kind public.message_kind,
  question_id uuid,
  duel_id uuid,
  created_at timestamptz,
  answer jsonb,
  duel jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.sender_id,
    m.kind,
    m.question_id,
    m.duel_id,
    m.created_at,
    (
      select jsonb_build_object('selected_answer', a.selected_answer, 'is_correct', a.is_correct, 'answered_at', a.answered_at)
      from public.shared_question_answers a where a.message_id = m.id
    ),
    (
      select jsonb_build_object(
        'status', d.status,
        'mode', d.mode,
        'challenger_id', d.challenger_id,
        'opponent_id', d.opponent_id,
        'challenger_correct', d.challenger_correct,
        'opponent_correct', d.opponent_correct,
        'winner_id', d.winner_id
      )
      from public.duels d where d.id = m.duel_id
    )
  from public.friend_messages m
  where public.are_friends(p_friend_id, auth.uid())
    and ((m.sender_id = auth.uid() and m.recipient_id = p_friend_id)
      or (m.sender_id = p_friend_id and m.recipient_id = auth.uid()))
  order by m.created_at
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

grant execute on function public.get_conversation(uuid, integer) to authenticated;
