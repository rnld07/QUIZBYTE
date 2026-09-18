-- =============================================================================
-- QuizByte – replay the questions the user got wrong
--
-- "Schwächen trainieren" on the progress screen builds a session from every
-- published question the user has answered incorrectly and has not answered
-- correctly since. Once a question is answered right it drops out of the list.
-- =============================================================================

-- How many such questions are left ---------------------------------------------------
-- SECURITY INVOKER: only the caller's own attempts are readable through RLS.

create or replace function public.count_my_wrong_questions()
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and exists (
      select 1 from public.quiz_attempts a
      where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
    )
    and not exists (
      select 1 from public.quiz_attempts a
      where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = true
    );
$$;

grant execute on function public.count_my_wrong_questions() to authenticated;

-- The questions themselves, oldest mistake first ----------------------------------------

create or replace function public.get_my_wrong_questions(p_limit integer default 30)
returns setof public.questions
language sql
stable
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and exists (
      select 1 from public.quiz_attempts a
      where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
    )
    and not exists (
      select 1 from public.quiz_attempts a
      where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = true
    )
  order by (
    select min(a.created_at) from public.quiz_attempts a
    where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
  )
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.get_my_wrong_questions(integer) to authenticated;
