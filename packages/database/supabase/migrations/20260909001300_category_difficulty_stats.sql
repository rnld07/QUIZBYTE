-- =============================================================================
-- QuizByte – Schwierigkeitsverteilung innerhalb einer Kategorie
--
-- Feeds the small breakdown in the category detail sheet. Same shape and
-- security model as get_my_difficulty_stats(), nur auf eine Kategorie begrenzt.
-- =============================================================================

create or replace function public.get_my_category_difficulty_stats(p_category_id uuid)
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
    and q.category_id = p_category_id
  group by q.difficulty;
$$;

grant execute on function public.get_my_category_difficulty_stats(uuid) to authenticated;
