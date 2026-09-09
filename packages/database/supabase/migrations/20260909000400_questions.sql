-- =============================================================================
-- QuizByte – questions
-- =============================================================================

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  subcategory text,
  question_text text not null,
  answer_a text not null,
  answer_b text not null,
  answer_c text not null,
  answer_d text not null,
  correct_answer public.answer_key not null,
  explanation text not null default '',
  difficulty public.difficulty_level not null default 'medium',
  tags text[] not null default '{}',
  image_url text,
  audio_url text,
  status public.question_status not null default 'draft',
  requires_pro boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint questions_subcategory_length check (subcategory is null or char_length(subcategory) between 1 and 80),
  constraint questions_tags_limit check (cardinality(tags) <= 20)
);

comment on table public.questions is 'Quiz questions. Only status = published questions are visible to app users.';

create index questions_category_status_idx on public.questions (category_id, status);
create index questions_status_idx on public.questions (status);
create index questions_subcategory_idx on public.questions (subcategory) where subcategory is not null;
create index questions_tags_idx on public.questions using gin (tags);
create index questions_updated_at_idx on public.questions (updated_at desc);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- Publish validation ---------------------------------------------------------------
-- Mirrors validateQuestionForPublish() in packages/shared. Drafts may be incomplete,
-- published questions never.

create or replace function public.validate_question_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if btrim(new.question_text) = '' then
      raise exception 'question_text is required to publish' using errcode = 'check_violation';
    end if;
    if btrim(new.answer_a) = '' or btrim(new.answer_b) = '' or btrim(new.answer_c) = '' or btrim(new.answer_d) = '' then
      raise exception 'all four answers are required to publish' using errcode = 'check_violation';
    end if;
    if btrim(new.explanation) = '' then
      raise exception 'explanation is required to publish' using errcode = 'check_violation';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger questions_validate_publish
  before insert or update on public.questions
  for each row execute function public.validate_question_publish();

-- Pro entitlement hook ---------------------------------------------------------------
-- Central place to plug in subscriptions later. Returns false while Pro is disabled.

create or replace function public.user_has_pro()
returns boolean
language sql
stable
set search_path = ''
as $$
  select false;
$$;

comment on function public.user_has_pro() is 'Extension point for Pro subscriptions. Always false in V1.';

-- Row Level Security -------------------------------------------------------------------

alter table public.questions enable row level security;

create policy "questions: users read published questions"
  on public.questions for select
  to authenticated
  using (
    status = 'published'
    and (requires_pro = false or public.user_has_pro())
  );

create policy "questions: admins manage"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.questions to authenticated;

-- Category overview with published counts ---------------------------------------------
-- security_invoker: the count respects the caller's RLS on questions.

create view public.categories_overview
with (security_invoker = true)
as
select
  c.id,
  c.slug,
  c.name,
  c.description,
  c.icon,
  c.accent_color,
  c.sort_order,
  c.is_active,
  c.requires_pro,
  c.created_at,
  c.updated_at,
  (
    select count(*)
    from public.questions q
    where q.category_id = c.id and q.status = 'published'
  )::integer as published_question_count
from public.categories c;

grant select on public.categories_overview to anon, authenticated;
