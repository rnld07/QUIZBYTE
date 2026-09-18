-- =============================================================================
-- QuizByte – der eigene Punktestand im laufenden Duell
--
-- `challenger_correct` / `opponent_correct` werden erst beim Auswerten
-- geschrieben, also wenn beide durch sind. Wer selbst gespielt hat und auf den
-- Gegner wartet, sah deshalb bei sich einen Strich statt der eigenen Punkte.
--
-- Der eigene Stand kommt jetzt direkt aus der eigenen Sitzung mit – und zwar
-- ausschliesslich der eigene. Der des Gegners bleibt bis zum Auswerten
-- verborgen: er wird hier gar nicht erst berechnet, damit niemand vorher
-- weiss, wie viel er schlagen muss.
-- =============================================================================

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
        -- Gespielt heisst: eine Sitzung haengt dran. Der Punktestand kommt
        -- erst beim Auswerten dazu.
        'challenger_played', d.challenger_session_id is not null,
        'opponent_played', d.opponent_session_id is not null,
        -- Nur meine eigene Sitzung wird gezaehlt. Der Aufrufer erfaehrt damit
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
