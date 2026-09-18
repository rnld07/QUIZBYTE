-- =============================================================================
-- QuizByte – automatischer Rahmen und perfekte Runden
--
-- 1. Wer nie etwas ausgewählt hat, trägt automatisch den höchsten
--    freigeschalteten Rang. `selected_frame = null` heißt jetzt „nie gewählt",
--    `'none'` heißt „bewusst keinen Rahmen". Vorher liefen beide auf null
--    hinaus, damit ließ sich das nicht unterscheiden.
--
-- 2. „Perfektes Quiz": eine abgeschlossene Runde, in der jede Frage beantwortet
--    und jede Antwort richtig war.
--
-- Gegenstück in `packages/shared/src/domain/profile/frames.ts`.
-- =============================================================================

/** Der höchste Rang, den dieses Level trägt; null unterhalb des ersten. */
create or replace function public.best_frame_for_level(p_level integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_level, 1) >= 100 then 'platinum'
    when coalesce(p_level, 1) >= 75 then 'gold'
    when coalesce(p_level, 1) >= 50 then 'silver'
    when coalesce(p_level, 1) >= 25 then 'bronze'
    when coalesce(p_level, 1) >= 1 then 'graphite'
    else null
  end;
$$;

comment on function public.best_frame_for_level(integer) is 'Highest frame for a level. Keep in sync with PROFILE_FRAMES in packages/shared.';

grant execute on function public.best_frame_for_level(integer) to authenticated;

/**
 * Was andere zu sehen bekommen: die eigene Wahl, sonst der beste Rang.
 *
 * Wird hier aufgelöst und nicht im Client, weil Listen wie die Freundessuche
 * die XP des anderen gar nicht mitliefern.
 */
create or replace function public.effective_frame(p_selected text, p_total_xp integer)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(p_selected, public.best_frame_for_level(public.level_for_xp(coalesce(p_total_xp, 0))));
$$;

grant execute on function public.effective_frame(text, integer) to authenticated;

/** `null` setzt auf automatisch zurück, `'none'` nimmt den Rahmen bewusst ab. */
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
  if p_frame is null then
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

-- Perfekte Runden ----------------------------------------------------------------------

/**
 * Abgeschlossene Runden, in denen jede Frage beantwortet und jede Antwort
 * richtig war.
 *
 * Die Zahl wird bei Bedarf gezählt statt in `user_progress` mitgeführt: sie wird
 * selten gebraucht, und ein weiterer Zähler im Trigger wäre eine weitere Stelle,
 * die auseinanderlaufen kann.
 */
create or replace function public.count_perfect_sessions(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.quiz_sessions s
  where s.user_id = p_user_id
    and s.completed_at is not null
    and s.total_questions > 0
    and (
      select count(*) from public.quiz_attempts a
      where a.quiz_session_id = s.id and a.is_correct
    ) = s.total_questions;
$$;

grant execute on function public.count_perfect_sessions(uuid) to authenticated;

/** Die eigenen perfekten Runden. */
create or replace function public.count_my_perfect_sessions()
returns integer
language sql
stable
set search_path = ''
as $$
  select public.count_perfect_sessions(auth.uid());
$$;

grant execute on function public.count_my_perfect_sessions() to authenticated;

-- Freunde sehen den aufgelösten Rahmen ------------------------------------------------

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
  select
    f.id,
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    public.effective_frame(p.selected_frame, coalesce(up.total_xp, 0)),
    f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  left join public.user_progress up on up.user_id = p.id
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

