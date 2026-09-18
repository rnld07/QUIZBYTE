-- =============================================================================
-- QuizByte – the questions behind a category's numbers
--
-- Powers the drill-down on the progress screen: tapping "richtig", "falsch" or
-- "gesamt" lists the matching questions so they can be replayed.
--
-- Grouped per question (not per attempt) and judged by the LAST attempt, which
-- is what "ich hatte die falsch" means to a user. SECURITY DEFINER so archived
-- questions stay visible in the history; the user filter is explicit and only
-- questions the user has actually answered are returned.
-- =============================================================================

create or replace function public.get_my_category_questions(
  p_category_id uuid,
  p_filter text default 'all'
)
returns setof public.questions
language sql
stable
security definer
set search_path = ''
as $$
  with last_attempt as (
    select distinct on (a.question_id)
      a.question_id,
      a.is_correct,
      a.created_at
    from public.quiz_attempts a
    where a.user_id = auth.uid()
    order by a.question_id, a.created_at desc
  )
  select q.*
  from public.questions q
  join last_attempt la on la.question_id = q.id
  where q.category_id = p_category_id
    and (
      coalesce(p_filter, 'all') = 'all'
      or (p_filter = 'correct' and la.is_correct)
      or (p_filter = 'wrong' and not la.is_correct)
    )
  order by la.created_at desc
  limit 100;
$$;

grant execute on function public.get_my_category_questions(uuid, text) to authenticated;
