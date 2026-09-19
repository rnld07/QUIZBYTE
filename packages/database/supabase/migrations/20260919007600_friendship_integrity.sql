-- =============================================================================
-- QuizByte – eine Freundschaft braucht zwei
--
-- Die INSERT-Regel auf `friendships` prueft nur, wer anfragt:
--
--   with check (requester_id = auth.uid())
--
-- Der Status steht nicht darin. Ein Client, der statt `send_friend_request` eine
-- Zeile selbst einfuegt, kann sie also gleich mit `status = 'accepted'`
-- anlegen – und ist damit ohne Zutun des anderen dessen Freund, mit allem was
-- daran haengt: Profil, Fortschritt, Chat, Duelle. Dasselbe nach einer
-- Blockierung, denn `block_user` loescht zwar die Zeile, hindert aber niemanden,
-- sie neu zu schreiben.
--
-- Zwei Ebenen dagegen, weil eine allein zu leicht wieder aufgeht:
--
--   1. Die Schreibrechte auf der Tabelle fallen weg. Angelegt und beantwortet
--      wird nur noch ueber die vorhandenen Funktionen; die laufen als Eigentuemer
--      und sind davon nicht betroffen.
--   2. Die Regeln bleiben trotzdem stehen und werden geschaerft. Sie sind die
--      lesbare Fassung dessen, was gilt – und sie greifen wieder, falls jemand
--      die Rechte spaeter erneut vergibt.
--
-- Bestehende Freundschaften bleiben unangetastet. Eine, die ueber die Luecke
-- entstanden ist, sieht aus wie jede andere; sie nachtraeglich zu suchen waere
-- eine Entscheidung ueber echte Nutzerdaten und gehoert nicht in eine Migration.
-- =============================================================================

-- --- 1. Der direkte Weg an den Funktionen vorbei -----------------------------

revoke insert, update, delete on public.friendships from authenticated;

comment on table public.friendships is
  'Freundschaftsanfragen und bestaetigte Freundschaften. Geschrieben wird ausschliesslich '
  'ueber send_friend_request(), respond_friend_request(), remove_friend() und block_user().';


-- --- 2. Die Regeln sagen jetzt, was wirklich gilt -----------------------------

drop policy if exists "friendships: users request" on public.friendships;
create policy "friendships: users request"
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and responded_at is null
    and not public.is_suspended()
    and not public.is_blocked(requester_id, addressee_id)
  );

drop policy if exists "friendships: addressee responds" on public.friendships;
create policy "friendships: addressee responds"
  on public.friendships for update
  to authenticated
  -- Beantwortet wird nur, was offen ist: aus 'declined' wieder 'accepted' zu
  -- machen, ist keine Antwort, sondern eine zweite Chance ohne Anfrage.
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (
    addressee_id = (select auth.uid())
    and status in ('accepted', 'declined')
    and not public.is_blocked(requester_id, addressee_id)
  );


-- --- 3. Wer blockiert ist, ist nicht befreundet -------------------------------
--
-- `are_friends` haengt an Profil- und Fortschrittsregeln, am Chat, an Duellen
-- und an der Rangliste. Die Blockierung hier einzubauen heisst: sie greift an
-- all diesen Stellen zugleich, und keine davon kann sie vergessen.

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = p_a and f.addressee_id = p_b)
        or (f.requester_id = p_b and f.addressee_id = p_a))
  ) and not public.is_blocked(p_a, p_b);
$$;

comment on function public.are_friends(uuid, uuid) is
  'True when the two are confirmed friends and neither has blocked the other.';

revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;


-- --- 4. Die Funktionen pruefen, was die Regeln nicht koennen -------------------

/** Schickt eine Anfrage – oder nimmt eine offene Gegenanfrage direkt an. */
create or replace function public.send_friend_request(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_existing public.friendships%rowtype;
  v_id uuid;
begin
  if p_user_id is null or p_user_id = v_me then
    raise exception 'invalid friend request' using errcode = 'check_violation';
  end if;

  if public.is_blocked(v_me, p_user_id) then
    raise exception 'blocked' using errcode = 'insufficient_privilege';
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

revoke all on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;

/** Nimmt eine Anfrage an oder lehnt sie ab. Nur der Empfaenger darf das. */
create or replace function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_signed_in_user();
  v_request public.friendships%rowtype;
begin
  select * into v_request
  from public.friendships
  where id = p_friendship_id and addressee_id = v_me and status = 'pending'
  for update;

  if not found then
    raise exception 'friend request not found' using errcode = 'no_data_found';
  end if;

  -- Annehmen geht nicht, solange einer den anderen blockiert. Ablehnen schon:
  -- eine Absage kostet nichts und raeumt die offene Anfrage weg.
  if p_accept and public.is_blocked(v_request.requester_id, v_me) then
    raise exception 'blocked' using errcode = 'insufficient_privilege';
  end if;

  update public.friendships
  set status = case when p_accept then 'accepted'::public.friend_status else 'declined'::public.friend_status end,
      responded_at = now()
  where id = p_friendship_id;
end;
$$;

revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

/** Beendet eine Freundschaft oder zieht die eigene Anfrage zurueck. */
create or replace function public.remove_friend(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_signed_in_user();
begin
  delete from public.friendships f
  where (f.requester_id = v_me and f.addressee_id = p_user_id)
     or (f.requester_id = p_user_id and f.addressee_id = v_me);
end;
$$;

revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;
