-- =============================================================================
-- QuizByte – question selection and statistics RPCs
-- =============================================================================

-- Random published questions, optionally restricted to one category ------------------
-- SECURITY INVOKER: RLS on questions/categories applies to the caller.

create or replace function public.get_session_questions(
  p_category_id uuid default null,
  p_limit integer default 10
)
returns setof public.questions
language sql
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and (p_category_id is null or q.category_id = p_category_id)
  order by random()
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

grant execute on function public.get_session_questions(uuid, integer) to authenticated;

-- Questions from weak topics for "Schwächen trainieren" ----------------------------------

create or replace function public.get_training_questions(
  p_subcategories text[] default '{}',
  p_tags text[] default '{}',
  p_category_ids uuid[] default '{}',
  p_limit integer default 30
)
returns setof public.questions
language sql
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and (
      q.subcategory = any (coalesce(p_subcategories, '{}'))
      or q.tags && coalesce(p_tags, '{}')
      or q.category_id = any (coalesce(p_category_ids, '{}'))
    )
  order by random()
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.get_training_questions(text[], text[], uuid[], integer) to authenticated;

-- Per-category performance of the current user ----------------------------------------------
-- SECURITY DEFINER so archived questions still count towards history; the user filter is explicit.

create or replace function public.get_my_category_stats()
returns table (
  category_id uuid,
  category_slug text,
  category_name text,
  attempts bigint,
  correct bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.slug,
    c.name,
    count(a.id) as attempts,
    count(a.id) filter (where a.is_correct) as correct
  from public.quiz_attempts a
  join public.questions q on q.id = a.question_id
  join public.categories c on c.id = q.category_id
  where a.user_id = auth.uid()
  group by c.id, c.slug, c.name
  order by c.sort_order, c.name;
$$;

grant execute on function public.get_my_category_stats() to authenticated;

-- Topic performance (category / subcategory / tag) for weakness detection --------------------------

create or replace function public.get_my_topic_stats()
returns table (
  kind text,
  key text,
  label text,
  attempts bigint,
  correct bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'category'::text as kind, c.id::text as key, c.name as label,
         count(*) as attempts, count(*) filter (where a.is_correct) as correct
  from public.quiz_attempts a
  join public.questions q on q.id = a.question_id
  join public.categories c on c.id = q.category_id
  where a.user_id = auth.uid()
  group by c.id, c.name

  union all

  select 'subcategory'::text, q.subcategory, q.subcategory,
         count(*), count(*) filter (where a.is_correct)
  from public.quiz_attempts a
  join public.questions q on q.id = a.question_id
  where a.user_id = auth.uid() and q.subcategory is not null
  group by q.subcategory

  union all

  select 'tag'::text, t.tag, t.tag,
         count(*), count(*) filter (where a.is_correct)
  from public.quiz_attempts a
  join public.questions q on q.id = a.question_id
  cross join lateral unnest(q.tags) as t(tag)
  where a.user_id = auth.uid()
  group by t.tag;
$$;

grant execute on function public.get_my_topic_stats() to authenticated;

-- Admin dashboard counters -------------------------------------------------------------------------

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'questions_total', (select count(*) from public.questions),
    'questions_published', (select count(*) from public.questions where status = 'published'),
    'questions_draft', (select count(*) from public.questions where status = 'draft'),
    'questions_review', (select count(*) from public.questions where status = 'review'),
    'questions_archived', (select count(*) from public.questions where status = 'archived'),
    'questions_missing_audio', (select count(*) from public.questions where audio_url is null and status <> 'archived'),
    'questions_missing_image', (select count(*) from public.questions where image_url is null and status <> 'archived'),
    'categories_total', (select count(*) from public.categories),
    'categories_active', (select count(*) from public.categories where is_active),
    'users_total', (select count(*) from public.profiles),
    'attempts_total', (select count(*) from public.quiz_attempts)
  );
end;
$$;

grant execute on function public.get_admin_dashboard_stats() to authenticated;
