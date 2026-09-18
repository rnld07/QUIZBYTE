-- =============================================================================
-- QuizByte – Privatsphaere
--
-- Zwei Schalter auf dem Profil, beide standardmaessig an: so, wie die App sich
-- bisher verhalten hat, aendert sich fuer niemanden etwas, der sie nicht
-- anfasst.
--
--   searchable             – ob man ueber die Suche gefunden wird
--   allow_friend_requests  – ob einen fremde Leute anfragen duerfen
--
-- Beide sitzen auf `profiles` und nicht in einer eigenen Settings-Tabelle: sie
-- gehoeren zum oeffentlichen Bild eines Kontos, werden bei jeder Suche
-- mitgelesen und waeren als Join nur ein zweiter Ort fuer dieselbe Zeile.
-- Durchgesetzt werden sie in `search_users` und `send_friend_request`, die
-- beide als security definer laufen – mit dem anon-Key ist an ihnen nicht
-- vorbeizukommen.
-- =============================================================================

alter table public.profiles
  add column if not exists searchable boolean not null default true,
  add column if not exists allow_friend_requests boolean not null default true;

comment on column public.profiles.searchable is 'Whether this account shows up in the user search.';
comment on column public.profiles.allow_friend_requests is 'Whether strangers may send a friend request.';

-- Suche: wer nicht gefunden werden will, wird nicht gefunden.
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
    and p.searchable
    -- Gesperrte Konten sind fuer die anderen nicht mehr da.
    and p.suspended_at is null
    and not public.is_blocked(p.id, auth.uid())
  order by p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.search_users(text, integer) to authenticated;

-- Anfragen: der Schalter des Empfaengers entscheidet, nicht der des Senders.
create or replace function public.send_friend_request(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_existing public.friendships%rowtype;
  v_id uuid;
  v_recent integer;
begin
  if v_me is null or p_user_id = v_me then
    raise exception 'invalid friend request' using errcode = 'check_violation';
  end if;

  if public.is_suspended(v_me) then
    raise exception 'Dieses Konto ist gesperrt.' using errcode = 'check_violation';
  end if;

  if public.is_blocked(v_me, p_user_id) then
    raise exception 'Diese Anfrage ist nicht möglich.' using errcode = 'check_violation';
  end if;

  /*
    Der Schalter gilt nur fuer den ersten Schritt. Wer mich selbst angefragt
    hat, darf von mir eine Antwort bekommen – sonst haetten zwei Leute, die
    beide keine Anfragen wollen, keinen Weg mehr zueinander, obwohl sie ihn
    gerade beide gehen.
  */
  if not exists (
    select 1 from public.friendships f
    where f.requester_id = p_user_id and f.addressee_id = v_me
  ) and exists (
    select 1 from public.profiles p
    where p.id = p_user_id and (not p.allow_friend_requests or p.suspended_at is not null)
  ) then
    raise exception 'Diese Person nimmt gerade keine Freundschaftsanfragen an.'
      using errcode = 'check_violation';
  end if;

  select count(*) into v_recent
  from public.friendships f
  where f.requester_id = v_me and f.created_at > now() - interval '1 hour';

  if v_recent >= 20 then
    raise exception 'Du hast gerade sehr viele Anfragen geschickt. Versuch es in einer Stunde noch einmal.'
      using errcode = 'check_violation';
  end if;

  select * into v_existing
  from public.friendships f
  where (f.requester_id = v_me and f.addressee_id = p_user_id)
     or (f.requester_id = p_user_id and f.addressee_id = v_me);

  if found then
    -- Er hat mich zuerst gefragt: die Anfrage gilt als angenommen.
    if v_existing.status = 'pending' and v_existing.addressee_id = v_me then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where id = v_existing.id;
    elsif v_existing.status = 'declined' then
      update public.friendships
      set status = 'pending', requester_id = v_me, addressee_id = p_user_id, responded_at = null, created_at = now()
      where id = v_existing.id;
    end if;
    return v_existing.id;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (v_me, p_user_id)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

/**
 * Setzt die beiden Schalter.
 *
 * Als Funktion statt als Update auf `profiles`, damit die App nicht die ganze
 * Zeile anfassen muss, um ein Haekchen zu setzen – und damit hier eine Stelle
 * ist, an der spaeter weitere Einstellungen dazukommen koennen.
 */
create or replace function public.set_privacy_settings(p_searchable boolean, p_allow_friend_requests boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set searchable = coalesce(p_searchable, searchable),
      allow_friend_requests = coalesce(p_allow_friend_requests, allow_friend_requests)
  where id = auth.uid();
$$;

grant execute on function public.set_privacy_settings(boolean, boolean) to authenticated;
