-- =============================================================================
-- QuizByte – ein Duell wird ausgewertet, wenn beide FERTIG sind
--
-- Der Fehler: `join_duel` haengt die Sitzung an das Duell, **bevor** die erste
-- Frage beantwortet ist – das muss es auch, sonst wuesste niemand, dass gerade
-- gespielt wird. `settle_duel` hat daraus geschlossen, beide haetten gespielt,
-- sobald beide eine Sitzung haben.
--
-- Damit reichte es, dass der Gegner den Chat oeffnet, waehrend man selbst noch
-- spielt: `settle_duel` lief los, zaehlte die bis dahin gespeicherten Antworten
-- – naemlich keine – schrieb 0, kuerte den anderen zum Sieger und setzte den
-- Status auf `finished`. Ab da kehrte die Funktion sofort wieder um, und die 0
-- blieb stehen. Genau das war der Fall "ich hatte 5 richtig, da steht 0".
--
-- Drei Aenderungen:
--   1. ausgewertet wird erst, wenn beide Sitzungen `completed_at` haben
--   2. "gespielt" im Chat heisst ebenfalls fertig, nicht angefangen
--   3. wer eine Runde abgebrochen hat, darf sie neu anfangen
--
-- Und einmalig: die Duelle reparieren, die es schon erwischt hat.
-- =============================================================================

create or replace function public.settle_duel(p_duel_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duel public.duels%rowtype;
  v_expired boolean;
  v_both_done boolean;
  v_challenger integer;
  v_opponent integer;
  v_winner uuid;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found or v_duel.status in ('finished', 'declined') then
    return;
  end if;

  v_expired := now() > v_duel.created_at + make_interval(days => public.duel_deadline_days());

  -- Fertig heisst: die Sitzung ist abgeschlossen. Eine angefangene Runde ist
  -- kein Ergebnis, sondern jemand, der gerade spielt.
  v_both_done :=
    exists (
      select 1 from public.quiz_sessions s
      where s.id = v_duel.challenger_session_id and s.completed_at is not null
    )
    and exists (
      select 1 from public.quiz_sessions s
      where s.id = v_duel.opponent_session_id and s.completed_at is not null
    );

  -- Solange die Frist laeuft, wird nur ausgewertet, wenn beide durch sind.
  if not v_both_done and not v_expired then
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

/**
 * Haengt die eigene Sitzung an das Duell.
 *
 * Eine abgebrochene Runde darf neu angefangen werden: die alte Sitzung wurde nie
 * abgeschlossen, zaehlt also fuer nichts, und ohne diesen Weg zurueck haengt das
 * Duell bis zum Fristende fest, weil `already played` jeden zweiten Versuch
 * abgelehnt hat. Eine **abgeschlossene** Runde bleibt gesperrt – zweimal
 * antreten waere kein Duell mehr.
 */
create or replace function public.join_duel(p_duel_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duel public.duels%rowtype;
  v_mine uuid;
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
    v_mine := v_duel.challenger_session_id;
  elsif auth.uid() = v_duel.opponent_id then
    v_mine := v_duel.opponent_session_id;
  else
    raise exception 'not a participant' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.quiz_sessions s where s.id = v_mine and s.completed_at is not null) then
    raise exception 'already played' using errcode = 'check_violation';
  end if;

  if auth.uid() = v_duel.challenger_id then
    update public.duels set challenger_session_id = p_session_id, status = 'active' where id = p_duel_id;
  else
    update public.duels set opponent_session_id = p_session_id, status = 'active' where id = p_duel_id;
  end if;
end;
$$;

grant execute on function public.join_duel(uuid, uuid) to authenticated;

-- "Gespielt" heisst auch im Chat: fertig ---------------------------------------------

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
        -- Fertig, nicht angefangen: eine laufende Runde ist kein Ergebnis, und
        -- "Gespielt – warten auf X" waere daneben, solange X noch tippt.
        'challenger_played', exists (
          select 1 from public.quiz_sessions s
          where s.id = d.challenger_session_id and s.completed_at is not null
        ),
        'opponent_played', exists (
          select 1 from public.quiz_sessions s
          where s.id = d.opponent_session_id and s.completed_at is not null
        ),
        -- Nur die eigene Sitzung wird gezaehlt. Der Aufrufer erfaehrt damit
        -- nichts, was er nicht selbst gespielt hat.
        'my_correct', (
          select count(*) filter (where a.is_correct)
          from public.quiz_attempts a
          where a.quiz_session_id = case
            when d.challenger_id = auth.uid() then d.challenger_session_id
            when d.opponent_id = auth.uid() then d.opponent_session_id
          end
        ),
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

-- Die schon falsch gewerteten Duelle geradeziehen -------------------------------------

-- Nur dort, wo der gespeicherte Stand nicht zu den tatsaechlichen Antworten
-- passt. Die XP fuer einen falsch vergebenen Sieg bleiben stehen: sie wurden
-- gutgeglaeubig verdient, und sie jemandem wieder wegzunehmen richtet mehr
-- Schaden an als die falsche Zahl je angerichtet hat.
with actual as (
  select
    d.id,
    (select count(*) filter (where a.is_correct) from public.quiz_attempts a where a.quiz_session_id = d.challenger_session_id)::integer as challenger_correct,
    (select count(*) filter (where a.is_correct) from public.quiz_attempts a where a.quiz_session_id = d.opponent_session_id)::integer as opponent_correct,
    d.challenger_id,
    d.opponent_id
  from public.duels d
  where d.status = 'finished'
)
update public.duels d
set challenger_correct = a.challenger_correct,
    opponent_correct = a.opponent_correct,
    winner_id = case
      when a.challenger_correct > a.opponent_correct then a.challenger_id
      when a.opponent_correct > a.challenger_correct then a.opponent_id
      else null
    end
from actual a
where d.id = a.id
  and (d.challenger_correct is distinct from a.challenger_correct
    or d.opponent_correct is distinct from a.opponent_correct);
