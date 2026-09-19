-- =============================================================================
-- QuizByte – der Chat hat mehr als hundert Nachrichten
--
-- `get_conversation` liest aufsteigend und bricht bei hundert ab. Das ist genau
-- verkehrt herum: abgeschnitten wird am *neuen* Ende. Ein Chat mit 101
-- Nachrichten zeigt die aeltesten hundert, und die letzte Nachricht – die, um
-- die es geht – fehlt. Nachladen gab es nicht.
--
-- Die neue Funktion liest absteigend und nimmt einen Cursor: "alles vor diesem
-- Zeitpunkt". Damit kommt immer das neue Ende zuerst, und aeltere Seiten holt
-- der Client nach, wenn jemand hochscrollt. Die Reihenfolge fuers Anzeigen
-- dreht er zurueck.
--
-- Als eigene Funktion, nicht als Ersatz: `get_conversation` gibt aufsteigend
-- zurueck, und eine App, die das erwartet, bekaeme ihren Chat sonst auf den
-- Kopf gestellt. Sie faellt mit dem Abschaltrelease weg, in dem auch die
-- uebrigen alten Wege verschwinden.
--
-- Der Tie-Break ueber die Id gehoert dazu: zwei Nachrichten koennen denselben
-- Zeitstempel tragen – eine Frage und das Duell, das jemand gleich danach
-- geschickt hat. Ohne ihn faellt beim Blaettern eine davon heraus oder kommt
-- zweimal.
-- =============================================================================

create or replace function public.get_conversation_page(
  p_friend_id uuid,
  p_limit integer default 40,
  p_before timestamptz default null,
  p_before_id uuid default null
)
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
        'challenger_played', exists (
          select 1 from public.quiz_sessions s
          where s.id = d.challenger_session_id and s.completed_at is not null
        ),
        'opponent_played', exists (
          select 1 from public.quiz_sessions s
          where s.id = d.opponent_session_id and s.completed_at is not null
        ),
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
    and (
      p_before is null
      or m.created_at < p_before
      or (m.created_at = p_before and p_before_id is not null and m.id < p_before_id)
    )
  order by m.created_at desc, m.id desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

comment on function public.get_conversation_page(uuid, integer, timestamptz, uuid) is
  'One page of a conversation, newest first. Pass the oldest row of a page back as the cursor for the next one.';

revoke all on function public.get_conversation_page(uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.get_conversation_page(uuid, integer, timestamptz, uuid) to authenticated;
