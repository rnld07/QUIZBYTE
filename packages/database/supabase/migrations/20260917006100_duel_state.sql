-- =============================================================================
-- QuizByte – der Stand eines einzelnen Duells
--
-- Die Ergebnisseite einer Duellrunde soll zeigen, wie es gegen den anderen
-- steht, nicht nur was man selbst geschafft hat. Dafuer fehlte der Weg, ein
-- einzelnes Duell abzufragen: der Chat bekommt es als Teil der Nachrichten,
-- und `get_my_duels` gibt alle zurueck.
--
-- Gleiche Sichtbarkeitsregel wie im Chat: der eigene Stand sofort, der des
-- Gegners erst, wenn ausgewertet ist. Wer zuerst spielt, soll nicht wissen,
-- was der andere zu schlagen hat – und wer zweiter ist, nicht, was er schlagen
-- muss.
-- =============================================================================

create or replace function public.get_duel(p_duel_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
    'winner_id', d.winner_id,
    'created_at', d.created_at
  )
  from public.duels d
  where d.id = p_duel_id
    and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid());
$$;

comment on function public.get_duel(uuid) is
  'One duel, as the two players are allowed to see it. Same rule as get_conversation.';

grant execute on function public.get_duel(uuid) to authenticated;
