-- =============================================================================
-- QuizByte – foundation: extensions, enums, shared helper functions
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- Enumerations -----------------------------------------------------------------

create type public.answer_key as enum ('A', 'B', 'C', 'D');
create type public.difficulty_level as enum ('easy', 'medium', 'hard');
create type public.question_status as enum ('draft', 'review', 'published', 'archived');
create type public.session_type as enum ('category', 'random', 'weakness', 'daily', 'duel', 'exam');
create type public.user_role as enum ('user', 'admin');

-- Generic updated_at trigger ----------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'Sets updated_at = now() on every update.';
