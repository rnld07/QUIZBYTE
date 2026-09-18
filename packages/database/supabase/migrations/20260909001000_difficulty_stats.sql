-- =============================================================================
-- QuizByte – performance per difficulty level
--
-- Feeds the detailed analysis on the progress screen. SECURITY DEFINER like the
-- other stats RPCs so archived questions still count towards the history; the
-- user filter is explicit.
-- =============================================================================

create or replace function public.get_my_difficulty_stats()
returns table (
  difficulty public.difficulty_level,
  attempts bigint,
  correct bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.difficulty,
    count(a.id) as attempts,
    count(a.id) filter (where a.is_correct) as correct
  from public.quiz_attempts a
  join public.questions q on q.id = a.question_id
  where a.user_id = auth.uid()
  group by q.difficulty;
$$;

grant execute on function public.get_my_difficulty_stats() to authenticated;
