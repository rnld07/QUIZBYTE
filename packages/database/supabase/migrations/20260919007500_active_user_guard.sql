-- =============================================================================
-- QuizByte – wer nicht angemeldet ist, ist niemand
--
-- Drei Funktionen pruefen den Besitz einer Zeile so:
--
--   if not found or v_row.user_id <> auth.uid() then raise ...
--
-- Das liest sich richtig und ist es auch – solange jemand angemeldet ist. Ist
-- `auth.uid()` NULL, ergibt der Vergleich NULL, `false or NULL` ergibt NULL,
-- und `if NULL then` fuehrt den Zweig nicht aus. Die Pruefung faellt also
-- ausgerechnet dann aus, wenn sie gebraucht wird: beim anonymen Aufruf.
--
-- Erreichbar ist das, weil PostgreSQL neuen Funktionen standardmaessig EXECUTE
-- fuer PUBLIC gibt und Supabase zusaetzlich `alter default privileges ... grant
-- all on functions to anon` gesetzt hat. Die Rolle `anon` kann jede dieser
-- Funktionen aufrufen; `auth.uid()` ist dabei NULL.
--
-- Diese Migration macht daraus einen Fehler statt eines Durchlassers. Zwei
-- Waechter, weil zwei Fragen zu unterscheiden sind:
--
--   require_signed_in_user()  – ist ueberhaupt jemand da?
--   require_active_user()     – und darf der auch handeln?
--
-- Eine Runde abschliessen oder ein Duell ablehnen darf auch ein gesperrtes
-- Konto: das eine rechnet nur ab, was schon gespielt wurde, das andere ist eine
-- Absage. Neues anfangen darf es nicht – das steht in den anderen Migrationen.
-- =============================================================================

create or replace function public.require_signed_in_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  return v_id;
end;
$$;

comment on function public.require_signed_in_user() is
  'Returns auth.uid() or raises. Use instead of comparing against a possibly NULL auth.uid().';

revoke all on function public.require_signed_in_user() from public, anon;
grant execute on function public.require_signed_in_user() to authenticated;

create or replace function public.require_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.require_signed_in_user();
begin
  if public.is_suspended(v_id) then
    raise exception 'account is suspended' using errcode = 'insufficient_privilege';
  end if;
  return v_id;
end;
$$;

comment on function public.require_active_user() is
  'Returns auth.uid() for a signed-in, unsuspended user; raises otherwise.';

revoke all on function public.require_active_user() from public, anon;
grant execute on function public.require_active_user() to authenticated;


-- --- Runde abschliessen ------------------------------------------------------
-- Unveraendert bis auf den Waechter: `is distinct from` statt `<>`, und der
-- Aufrufer muss angemeldet sein.

create or replace function public.complete_quiz_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_signed_in_user();
  v_session public.quiz_sessions%rowtype;
  v_progress public.user_progress%rowtype;
  v_answered integer;
  v_bonus integer := 0;
begin
  select * into v_session from public.quiz_sessions where id = p_session_id for update;
  if not found or v_session.user_id is distinct from v_me then
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

revoke all on function public.complete_quiz_session(uuid) from public, anon;
grant execute on function public.complete_quiz_session(uuid) to authenticated;


-- --- Duell ablehnen ----------------------------------------------------------
-- Hier war es am deutlichsten: `if v_duel.opponent_id <> auth.uid() then return
-- false` ist bei NULL kein `return false`, sondern ein Weiterlaufen. Ein
-- anonymer Aufruf konnte damit jedes fremde Duell absagen.

create or replace function public.decline_duel(p_duel_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_signed_in_user();
  v_duel public.duels%rowtype;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;

  if not found then
    return false;
  end if;

  -- Nur der Herausgeforderte. Wer selbst herausfordert, nimmt die Einladung
  -- zurueck, indem er sie nicht spielt – ablehnen kann er sie nicht.
  if v_duel.opponent_id is distinct from v_me then
    return false;
  end if;

  if v_duel.status not in ('pending', 'active') then
    return false;
  end if;

  -- Wer schon gespielt hat, hat angenommen.
  if v_duel.opponent_session_id is not null then
    return false;
  end if;

  update public.duels
  set status = 'declined', finished_at = now()
  where id = p_duel_id;

  return true;
end;
$$;

comment on function public.decline_duel(uuid) is
  'The challenged player declines. Works until they have played themselves; returns false when it does not apply.';

revoke all on function public.decline_duel(uuid) from public, anon;
grant execute on function public.decline_duel(uuid) to authenticated;


-- --- Geteilte Frage beantworten ----------------------------------------------
-- Dieselbe Luecke, vom Pruefbericht nicht genannt: `v_message.recipient_id <>
-- auth.uid()` liess anonym jede geteilte Frage beantworten. Die Funktion gibt
-- zurueck, ob die Antwort richtig war – sie war damit eine Auskunftsstelle
-- ueber die Loesung jeder geteilten Frage.

create or replace function public.answer_shared_question(p_message_id uuid, p_answer public.answer_key)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_signed_in_user();
  v_message public.friend_messages%rowtype;
  v_correct public.answer_key;
  v_is_correct boolean;
begin
  select * into v_message from public.friend_messages where id = p_message_id;
  if not found or v_message.recipient_id is distinct from v_me or v_message.kind <> 'question' then
    raise exception 'message not found' using errcode = 'no_data_found';
  end if;

  select q.correct_answer into v_correct from public.questions q where q.id = v_message.question_id;
  v_is_correct := (p_answer = v_correct);

  insert into public.shared_question_answers (message_id, user_id, selected_answer, is_correct)
  values (p_message_id, v_me, p_answer, v_is_correct)
  on conflict (message_id) do nothing;

  return v_is_correct;
end;
$$;

revoke all on function public.answer_shared_question(uuid, public.answer_key) from public, anon;
grant execute on function public.answer_shared_question(uuid, public.answer_key) to authenticated;
