-- =============================================================================
-- QuizByte – categories
-- =============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  accent_color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  requires_pro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_name_length check (char_length(name) between 1 and 60),
  constraint categories_accent_color_format check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$')
);

comment on table public.categories is 'Quiz categories. "Random" is virtual and not stored here.';

create index categories_sort_idx on public.categories (sort_order, name);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy "categories: everyone reads active categories"
  on public.categories for select
  to authenticated, anon
  using (is_active = true);

create policy "categories: admins manage"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
