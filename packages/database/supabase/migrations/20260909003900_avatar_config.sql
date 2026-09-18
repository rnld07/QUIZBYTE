-- =============================================================================
-- QuizByte – gezeichneter Avatar statt Profilbild
--
-- Es gibt kein hochgeladenes Profilbild mehr. Stattdessen stellt sich jeder
-- seinen Hund oder seine Katze zusammen: Fell, Rasse, Brille, Zubehoer. Das
-- steht als kleines JSON-Objekt auf dem Profil und wird von der App gezeichnet –
-- kein Upload, kein Speicherplatz, kein Bild, das geladen werden muss.
--
-- `avatar_url` bleibt bestehen und wird nicht geleert: die Spalte gehoert den
-- Nutzern, und ein frueher hochgeladenes Bild zu loeschen waere nicht unsere
-- Entscheidung. Gelesen wird sie nirgends mehr.
--
-- Gegenstueck in `packages/shared/src/domain/profile/avatar.ts`. Die Ids dort
-- sind das Format; die Datenbank prueft sie bewusst nicht, damit ein neuer
-- Eintrag in der App keine Migration braucht. Unbekanntes faellt beim Lesen auf
-- den Standard zurueck.
-- =============================================================================

alter table public.profiles
  add column avatar_config jsonb not null default '{}'::jsonb;

comment on column public.profiles.avatar_config is
  'Drawn pet avatar (species, fur, breed, glasses, accessory, accent). Keep in sync with packages/shared avatar.ts.';

-- Nur ein Objekt, und klein genug, dass niemand die Spalte als Ablage benutzt.
alter table public.profiles
  add constraint profiles_avatar_config_object
  check (jsonb_typeof(avatar_config) = 'object' and length(avatar_config::text) <= 500);

-- Spaltenrechte sind einzeln vergeben (siehe 000200_profiles): ohne diesen
-- Grant duerfte niemand seinen eigenen Avatar aendern.
grant update (avatar_config) on public.profiles to authenticated;

-- Freunde und Suche liefern den Avatar mit ------------------------------------------------

drop function if exists public.get_my_friends();

create or replace function public.get_my_friends()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_config jsonb,
  selected_frame text,
  total_xp integer,
  friends_since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_config,
    public.effective_frame(p.selected_frame, coalesce(up.total_xp, 0)),
    coalesce(up.total_xp, 0),
    f.responded_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join public.user_progress up on up.user_id = p.id
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by p.username;
$$;

grant execute on function public.get_my_friends() to authenticated;

drop function if exists public.get_friend_requests();

create or replace function public.get_friend_requests()
returns table (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_config jsonb,
  selected_frame text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    p.id,
    p.username,
    p.display_name,
    p.avatar_config,
    public.effective_frame(p.selected_frame, coalesce(up.total_xp, 0)),
    f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  left join public.user_progress up on up.user_id = p.id
  where f.addressee_id = auth.uid() and f.status = 'pending'
  order by f.created_at desc;
$$;

grant execute on function public.get_friend_requests() to authenticated;

drop function if exists public.search_users(text, integer);

create or replace function public.search_users(p_query text, p_limit integer default 20)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_config jsonb,
  selected_frame text,
  friend_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_config,
    public.effective_frame(p.selected_frame, coalesce(up.total_xp, 0)),
    coalesce(
      (
        select case
          when f.status = 'accepted' then 'friends'
          when f.status = 'pending' and f.requester_id = auth.uid() then 'requested'
          when f.status = 'pending' then 'incoming'
          else 'none'
        end
        from public.friendships f
        where (f.requester_id = auth.uid() and f.addressee_id = p.id)
           or (f.requester_id = p.id and f.addressee_id = auth.uid())
      ),
      'none'
    ) as friend_status
  from public.profiles p
  left join public.user_progress up on up.user_id = p.id
  where p.id <> auth.uid()
    and length(trim(p_query)) >= 2
    and p.username ilike '%' || trim(p_query) || '%'
  order by p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.search_users(text, integer) to authenticated;

create or replace function public.get_friend_profile(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_config', p.avatar_config,
    'selected_frame', public.effective_frame(p.selected_frame, coalesce(up.total_xp, 0)),
    'total_xp', coalesce(up.total_xp, 0),
    'current_streak', coalesce(up.current_streak, 0),
    'longest_streak', coalesce(up.longest_streak, 0),
    'questions_answered', coalesce(up.total_questions_answered, 0),
    'correct_answers', coalesce(up.total_correct_answers, 0),
    'sessions_completed', coalesce(up.total_sessions_completed, 0),
    'perfect_sessions', public.count_perfect_sessions(p.id)
  )
  from public.profiles p
  left join public.user_progress up on up.user_id = p.id
  where p.id = p_user_id and public.are_friends(p_user_id, auth.uid());
$$;

grant execute on function public.get_friend_profile(uuid) to authenticated;

-- Kein Upload mehr -----------------------------------------------------------------------

-- Die Regeln fallen weg, damit niemand mehr in den Bucket schreiben kann. Der
-- Bucket selbst und die vorhandenen Dateien bleiben; sie zu loeschen waere ein
-- Eingriff in fremde Daten, den diese Aenderung nicht verlangt.
drop policy if exists "avatars: users upload into own folder" on storage.objects;
drop policy if exists "avatars: users update own files" on storage.objects;
drop policy if exists "avatars: users delete own files" on storage.objects;
