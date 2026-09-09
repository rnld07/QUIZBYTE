-- =============================================================================
-- QuizByte – profiles, roles and the admin helper
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Mirrors validateUsername() in packages/shared: 3–20 chars, a-z 0-9 _ . ,
  -- no leading/trailing dot, no consecutive dots.
  constraint username_format check (
    username ~ '^[a-z0-9_](\.?[a-z0-9_])*$'
    and char_length(username) between 3 and 20
  ),
  constraint display_name_length check (display_name is null or char_length(display_name) between 1 and 40)
);

comment on table public.profiles is 'Public profile for every auth user (incl. anonymous guests). Usernames are unique case-insensitively.';

-- Usernames are stored lower-case, but the unique index is on lower() as a safety net.
create unique index profiles_username_unique on public.profiles (lower(username));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin helper -------------------------------------------------------------------
-- SECURITY DEFINER so it can be used inside RLS policies without recursion.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.is_admin() is 'True when the current auth user has the admin role.';

-- Prevent users from escalating their own role -------------------------------------

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'profile id cannot be changed';
  end if;
  if new.role <> old.role and not public.is_admin() and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'insufficient privileges to change role';
  end if;
  if new.is_anonymous <> old.is_anonymous and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'is_anonymous is managed by the system';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Username generation for new users ------------------------------------------------

create or replace function public.generate_username(p_user_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  candidate text;
  attempt int := 0;
begin
  candidate := 'user_' || substr(replace(p_user_id::text, '-', ''), 1, 8);
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    attempt := attempt + 1;
    candidate := 'user_' || substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10);
    if attempt > 20 then
      raise exception 'could not generate a unique username';
    end if;
  end loop;
  return candidate;
end;
$$;

-- Create profile + progress row for every new auth user ------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, is_anonymous)
  values (
    new.id,
    public.generate_username(new.id),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.is_anonymous, false)
  );

  insert into public.user_progress (user_id) values (new.id);
  return new;
end;
$$;

-- Keep is_anonymous in sync when a guest upgrades to a real account -----------------

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.is_anonymous, false) <> coalesce(old.is_anonymous, false) then
    update public.profiles
      set is_anonymous = coalesce(new.is_anonymous, false)
      where id = new.id;
  end if;
  return new;
end;
$$;

-- Row Level Security -------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles: users read own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: users update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: admins read all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "profiles: admins update all"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Column-level privileges: app users may only edit their public profile fields.
-- (Supabase grants ALL by default, hence the explicit revoke first.)
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;

-- Username availability check (does not leak other profile data) --------------------------

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
      and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

grant execute on function public.is_username_available(text) to authenticated;
