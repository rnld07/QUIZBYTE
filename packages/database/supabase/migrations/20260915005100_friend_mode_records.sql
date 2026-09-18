-- =============================================================================
-- QuizByte – die Bestwerte eines Freundes
--
-- Das Freundesprofil zeigte nur Zaehlerstaende. Was einen Spieler ausmacht,
-- steht aber in seinen Bestwerten: wie weit er im Survival kam, wie viele
-- Fragen er im Blitz geschafft hat.
--
-- Dieselbe Rechnung wie `get_my_mode_records`, nur fuer einen anderen Nutzer –
-- und nur, wenn man mit ihm befreundet ist. Ohne diese Pruefung waere es eine
-- Funktion, mit der sich die Statistik jedes beliebigen Kontos abrufen laesst.
-- =============================================================================

create or replace function public.get_friend_mode_records(p_user_id uuid)
returns table (
  mode public.quiz_mode,
  rounds integer,
  best_correct integer,
  best_answered integer,
  perfect_rounds integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with rounds as (
    select
      s.mode,
      s.total_questions,
      (select count(*) from public.quiz_attempts a where a.quiz_session_id = s.id) as answered,
      (select count(*) from public.quiz_attempts a where a.quiz_session_id = s.id and a.is_correct) as correct
    from public.quiz_sessions s
    where s.user_id = p_user_id
      and s.completed_at is not null
      and public.are_friends(p_user_id, auth.uid())
  )
  select
    r.mode,
    count(*)::integer,
    coalesce(max(r.correct), 0)::integer,
    coalesce(max(r.answered), 0)::integer,
    count(*) filter (where r.answered > 0 and r.correct = r.total_questions)::integer
  from rounds r
  group by r.mode;
$$;

comment on function public.get_friend_mode_records(uuid) is
  'Personal bests per quiz mode for a friend. Empty for anyone you are not friends with.';

grant execute on function public.get_friend_mode_records(uuid) to authenticated;
