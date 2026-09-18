-- =============================================================================
-- QuizByte – Daily-Fehler zählen nicht als Schwäche
--
-- Das Daily Quiz ist ein fester Tagessatz, der sich nicht neu verdienen lässt.
-- Fragen, die dort daneben gingen, landeten trotzdem in „Nochmal wiederholen?"
-- und in „Falsche Fragen wiederholen" – dort kann man sie zwar erneut spielen,
-- bekommt aber nichts dafür. Deshalb zählen ab jetzt nur Fehler aus den
-- übrigen Runden.
-- =============================================================================

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
      select 1
      from public.quiz_attempts a
      join public.quiz_sessions s on s.id = a.quiz_session_id
      where a.question_id = q.id
        and a.user_id = auth.uid()
        and a.is_correct = false
        and s.session_type <> 'daily'
    )
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    );
$$;

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
      select 1
      from public.quiz_attempts a
      join public.quiz_sessions s on s.id = a.quiz_session_id
      where a.question_id = q.id
        and a.user_id = auth.uid()
        and a.is_correct = false
        and s.session_type <> 'daily'
    )
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    )
  order by (
    select max(a.created_at)
    from public.quiz_attempts a
    join public.quiz_sessions s on s.id = a.quiz_session_id
    where a.question_id = q.id
      and a.user_id = auth.uid()
      and a.is_correct = false
      and s.session_type <> 'daily'
  ) desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;
