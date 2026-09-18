-- =============================================================================
-- QuizByte – freischaltbare Profilrahmen
--
-- Der gewählte Rahmen hängt am Profil, nicht an den Geräteeinstellungen: Er ist
-- überall sichtbar, wo das Profilbild auftaucht – auch bei Freunden.
--
-- Freigeschaltet wird über das Level, und das Level ergibt sich aus `total_xp`.
-- Damit der Server das prüfen kann statt dem Client zu glauben, wird die
-- Levelformel hier gespiegelt.
--
-- Gegenstücke in `packages/shared`:
--   * `config/xp.ts`            → LEVEL_BASE_XP, LEVEL_STEP_XP
--   * `domain/profile/frames.ts` → die Rahmen und ihre Level
-- Beim Ändern beide Seiten nachziehen.
-- =============================================================================

alter table public.profiles
  add column if not exists selected_frame text;

comment on column public.profiles.selected_frame is 'Id des ausgerüsteten Profilrahmens; null = kein Rahmen.';

/**
 * Level zu einem XP-Stand.
 *
 * Umkehrung von `totalXpForLevel`: mit s = level - 1, B = 100 und S = 20 sind
 * für ein Level `B*s + S*s*(s-1)/2` XP nötig, also `10*s^2 + 90*s`. Nach s
 * aufgelöst ergibt das
 *
 *     s = (-(2B - S) + sqrt((2B - S)^2 + 8*S*xp)) / (2*S)
 *
 * und das Level ist floor(s) + 1. Das Epsilon fängt ab, dass die Wurzel an
 * einer Levelgrenze knapp darunter landet und floor ein Level zu wenig liefert.
 */
create or replace function public.level_for_xp(p_total_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(
    1,
    least(
      999,
      floor(
        (-(2 * 100 - 20) + sqrt((2 * 100 - 20) ^ 2 + 8 * 20 * greatest(coalesce(p_total_xp, 0), 0))) / (2 * 20)
        + 1e-9
      )::integer + 1
    )
  );
$$;

comment on function public.level_for_xp(integer) is 'Level aus total_xp. Keep in sync with computeLevelProgress in packages/shared.';

grant execute on function public.level_for_xp(integer) to authenticated;

/** Ab welchem Level ein Rahmen tragbar ist; null für unbekannte Ids. */
create or replace function public.frame_required_level(p_frame text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_frame
    when 'none' then 1
    when 'slate' then 5
    when 'signal' then 10
    when 'trace' then 15
    when 'terminal' then 20
    when 'copper' then 25
    when 'bus' then 30
    when 'cyan' then 35
    when 'firewall' then 40
    when 'silicon' then 45
    when 'kernel' then 50
    when 'plasma' then 55
    when 'overclock' then 60
    when 'quantum' then 65
    when 'obsidian' then 70
    when 'aurora' then 75
    when 'titan' then 80
    when 'nova' then 85
    when 'root' then 90
    when 'prime' then 95
    when 'legend' then 100
    else null
  end;
$$;

comment on function public.frame_required_level(text) is 'Unlock level per frame. Keep in sync with PROFILE_FRAMES in packages/shared.';

grant execute on function public.frame_required_level(text) to authenticated;

/**
 * Rüstet einen Rahmen aus.
 *
 * Läuft über eine Funktion statt über ein Update auf `profiles`, weil nur hier
 * geprüft werden kann, ob das Level dafür reicht – ein Client könnte sonst
 * jeden Rahmen eintragen. `null` nimmt den Rahmen ab.
 */
create or replace function public.set_profile_frame(p_frame text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_required integer;
  v_level integer;
begin
  if p_frame is null or p_frame = 'none' then
    update public.profiles set selected_frame = null where id = auth.uid();
    return;
  end if;

  v_required := public.frame_required_level(p_frame);
  if v_required is null then
    raise exception 'unknown profile frame' using errcode = 'check_violation';
  end if;

  select public.level_for_xp(coalesce(up.total_xp, 0)) into v_level
  from public.user_progress up
  where up.user_id = auth.uid();

  if coalesce(v_level, 1) < v_required then
    raise exception 'profile frame is still locked' using errcode = 'insufficient_privilege';
  end if;

  update public.profiles set selected_frame = p_frame where id = auth.uid();
end;
$$;

grant execute on function public.set_profile_frame(text) to authenticated;

-- Der Rahmen gehört zu den Angaben, die Freunde voneinander sehen ----------------------
--
-- Die drei Listen bekommen eine Spalte dazu. Bei einer Funktion, die eine
-- Tabelle zurückgibt, lässt sich der Rückgabetyp per `create or replace` nicht
-- ändern (42P13) - sie müssen vorher weg. Mit dem Drop fallen auch ihre Rechte,
-- deshalb wird `grant execute` unten wiederholt.

drop function if exists public.get_my_friends();
drop function if exists public.get_friend_requests();
drop function if exists public.search_users(text, integer);

create or replace function public.get_my_friends()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
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
    p.avatar_url,
    p.selected_frame,
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

create or replace function public.get_friend_requests()
returns table (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  selected_frame text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, p.id, p.username, p.display_name, p.avatar_url, p.selected_frame, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid() and f.status = 'pending'
  order by f.created_at desc;
$$;

create or replace function public.search_users(p_query text, p_limit integer default 20)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
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
    p.avatar_url,
    p.selected_frame,
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
  where p.id <> auth.uid()
    and length(trim(p_query)) >= 2
    and p.username ilike '%' || trim(p_query) || '%'
  order by p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

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
    'avatar_url', p.avatar_url,
    'selected_frame', p.selected_frame,
    'total_xp', coalesce(up.total_xp, 0),
    'current_streak', coalesce(up.current_streak, 0),
    'longest_streak', coalesce(up.longest_streak, 0),
    'questions_answered', coalesce(up.total_questions_answered, 0),
    'correct_answers', coalesce(up.total_correct_answers, 0),
    'sessions_completed', coalesce(up.total_sessions_completed, 0)
  )
  from public.profiles p
  left join public.user_progress up on up.user_id = p.id
  where p.id = p_user_id and public.are_friends(p_user_id, auth.uid());
$$;

-- Nach dem Drop sind die Rechte weg, also erneut vergeben.
grant execute on function public.get_my_friends() to authenticated;
grant execute on function public.get_friend_requests() to authenticated;
grant execute on function public.search_users(text, integer) to authenticated;
grant execute on function public.get_friend_profile(uuid) to authenticated;
