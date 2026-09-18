-- =============================================================================
-- QuizByte – wer hat schon gespielt
--
-- Im Chat stand nach der eigenen Runde weiter "Spielen". Der Grund: die App
-- liest ab, ob `challenger_correct` bzw. `opponent_correct` gefuellt ist – und
-- das passiert erst beim Auswerten, also wenn *beide* durch sind. Zwischen der
-- eigenen Runde und der des Gegners sah die App also aus, als haette man noch
-- gar nicht gespielt.
--
-- Die Antwort steht in den Session-Spalten: wer eine Sitzung eingetragen hat,
-- hat gespielt. Die gehen jetzt als zwei Flags mit.
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
