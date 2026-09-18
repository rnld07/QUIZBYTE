-- =============================================================================
-- QuizByte – die gemeinsame Duellbilanz
--
-- Auf dem Profil eines Freundes fehlte das, wonach man dort als Erstes schaut:
-- wie es zwischen den beiden steht. Gezaehlt werden nur beendete Duelle –
-- ein laufendes ist noch kein Ergebnis, ein abgelehntes nie eines gewesen.
-- =============================================================================

create or replace function public.get_duel_record(p_user_id uuid)
returns table (
  played integer,
  won integer,
  drawn integer,
  lost integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::integer,
    count(*) filter (where d.winner_id = auth.uid())::integer,
    count(*) filter (where d.winner_id is null)::integer,
    count(*) filter (where d.winner_id is not null and d.winner_id <> auth.uid())::integer
  from public.duels d
  where d.status = 'finished'
    and public.are_friends(p_user_id, auth.uid())
    and ((d.challenger_id = auth.uid() and d.opponent_id = p_user_id)
      or (d.challenger_id = p_user_id and d.opponent_id = auth.uid()));
$$;

comment on function public.get_duel_record(uuid) is
  'Head-to-head record against one friend. Finished duels only.';

grant execute on function public.get_duel_record(uuid) to authenticated;
