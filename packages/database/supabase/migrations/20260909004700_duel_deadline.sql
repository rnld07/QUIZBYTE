-- =============================================================================
-- QuizByte – Duelle laufen nach drei Tagen ab
--
-- Bisher blieb eine Herausforderung ewig offen: wer nicht antwortete, liess sie
-- einfach liegen, und im Chat stand fuer immer "warten auf ...".
--
-- Ab jetzt gilt eine Frist von drei Tagen ab dem Absenden. Danach wird das
-- Duell gewertet, wie es dasteht: wer gespielt hat, gewinnt gegen den, der es
-- nicht getan hat. Hat keiner gespielt, endet es ohne Sieger.
--
-- Gewertet wird beim Nachsehen, nicht per Cron: `settle_duel` laeuft ohnehin
-- jedes Mal, wenn ein Chat geoeffnet wird, und ein Job, der nur ein Feld
-- umstellt, waere eine Maschine mehr, die laufen muss.
-- =============================================================================

/** Muss mit DUEL_DEADLINE_DAYS in packages/shared uebereinstimmen. */
create or replace function public.duel_deadline_days()
returns integer
language sql
immutable
as $$ select 3; $$;

grant execute on function public.duel_deadline_days() to authenticated;

-- Niemand faengt nach Ablauf noch eine Runde an -------------------------------------

create or replace function public.join_duel(p_duel_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duel public.duels%rowtype;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found then
    raise exception 'duel not found' using errcode = 'no_data_found';
  end if;

  if v_duel.status in ('finished', 'declined') then
    raise exception 'duel is closed' using errcode = 'check_violation';
  end if;

  if now() > v_duel.created_at + make_interval(days => public.duel_deadline_days()) then
    raise exception 'duel has expired' using errcode = 'check_violation';
  end if;

  if auth.uid() = v_duel.challenger_id then
    if v_duel.challenger_session_id is not null then
      raise exception 'already played' using errcode = 'check_violation';
    end if;
    update public.duels set challenger_session_id = p_session_id, status = 'active' where id = p_duel_id;
  elsif auth.uid() = v_duel.opponent_id then
    if v_duel.opponent_session_id is not null then
      raise exception 'already played' using errcode = 'check_violation';
    end if;
    update public.duels set opponent_session_id = p_session_id, status = 'active' where id = p_duel_id;
  else
    raise exception 'not a participant' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

grant execute on function public.join_duel(uuid, uuid) to authenticated;

-- Auswerten, wenn beide durch sind – oder wenn die Frist um ist ---------------------

create or replace function public.settle_duel(p_duel_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duel public.duels%rowtype;
  v_expired boolean;
  v_challenger integer;
  v_opponent integer;
  v_winner uuid;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found or v_duel.status in ('finished', 'declined') then
    return;
  end if;

  v_expired := now() > v_duel.created_at + make_interval(days => public.duel_deadline_days());

  -- Solange die Frist laeuft, wird nur ausgewertet, wenn beide gespielt haben.
  if (v_duel.challenger_session_id is null or v_duel.opponent_session_id is null) and not v_expired then
    return;
  end if;

  -- Wer nicht angetreten ist, hat null richtige Antworten.
  select coalesce(count(*) filter (where a.is_correct), 0) into v_challenger
  from public.quiz_attempts a where a.quiz_session_id = v_duel.challenger_session_id;
  select coalesce(count(*) filter (where a.is_correct), 0) into v_opponent
  from public.quiz_attempts a where a.quiz_session_id = v_duel.opponent_session_id;

  if v_challenger > v_opponent then
    v_winner := v_duel.challenger_id;
  elsif v_opponent > v_challenger then
    v_winner := v_duel.opponent_id;
  end if;

  update public.duels
  set status = 'finished',
      challenger_correct = v_challenger,
      opponent_correct = v_opponent,
      winner_id = v_winner,
      finished_at = now()
  where id = p_duel_id;

  if v_winner is not null then
    update public.user_progress
    set total_xp = total_xp + public.xp_for_duel_win()
    where user_id = v_winner;
  end if;
end;
$$;

grant execute on function public.settle_duel(uuid) to authenticated;
