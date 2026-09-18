-- =============================================================================
-- QuizByte – eine richtig beantwortete Frage ist keine offene Schwaeche mehr
--
-- Bisher galt: einmal falsch, immer in der Liste. Wer die Frage spaeter richtig
-- hatte, bekam sie trotzdem weiter unter "Falsche Fragen wiederholen" – die
-- Liste wuchs nur und wurde nie kuerzer, und Ueben fuehlte sich folgenlos an.
--
-- Ab jetzt entscheidet der **letzte** Versuch: war er richtig, verschwindet die
-- Frage. Geht sie spaeter wieder daneben, ist sie wieder da.
--
-- `dismissed_weaknesses` bleibt daneben bestehen – damit legt man eine Frage
-- bewusst weg, auch ohne sie richtig zu haben.
-- =============================================================================

/** True, solange der letzte Versuch zu dieser Frage falsch war. */
create or replace function public.is_open_weakness(p_question_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select not a.is_correct
      from public.quiz_attempts a
      where a.question_id = p_question_id and a.user_id = auth.uid()
      order by a.created_at desc, a.id desc
      limit 1
    ),
    false
  );
$$;

comment on function public.is_open_weakness(uuid) is 'Latest attempt on this question was wrong – it is still an open weakness.';

grant execute on function public.is_open_weakness(uuid) to authenticated;

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
    and public.is_open_weakness(q.id)
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    );
$$;

grant execute on function public.count_my_wrong_questions() to authenticated;

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
    and public.is_open_weakness(q.id)
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    )
  -- Der juengste Fehler zuerst: das ist das, was gerade drueckt.
  order by (
    select max(a.created_at) from public.quiz_attempts a
    where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
  ) desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.get_my_wrong_questions(integer) to authenticated;
