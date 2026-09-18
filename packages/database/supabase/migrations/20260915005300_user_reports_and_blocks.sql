-- =============================================================================
-- QuizByte – Nutzer melden und blockieren
--
-- Zwei getrennte Dinge mit zwei getrennten Tabellen:
--
--   melden     – geht an uns. Der Gemeldete merkt nichts, fuer ihn aendert
--                sich nichts. Gleiche Bauart wie `question_reports`.
--   blockieren – wirkt sofort und beidseitig. Wer blockiert ist, kann keine
--                Anfrage mehr schicken und taucht in der Suche nicht mehr auf;
--                eine bestehende Freundschaft wird dabei aufgeloest.
--
-- Die Blockade sitzt in den Funktionen, nicht in der App: `search_users` und
-- `send_friend_request` laufen als security definer, und was sie nicht
-- herausgeben, ist mit dem anon-Key auch nicht zu holen.
-- =============================================================================

-- Melden ---------------------------------------------------------------------

create type public.user_report_reason as enum (
  'username',
  'spam',
  'harassment',
  'cheating',
  'other'
);

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason public.user_report_reason not null,
  -- Freitext des Melders; leer erlaubt, der Grund allein reicht.
  details text not null default '' check (char_length(details) <= 1000),
  -- Gleiche Zustaende wie bei den Fragen, damit das Adminpanel spaeter beide
  -- Listen gleich behandeln kann.
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint user_reports_not_self check (reporter_id <> reported_id),
  -- Derselbe Grund gegen dieselbe Person zaehlt einmal. Ein zweiter Grund geht
  -- weiter durch: wer erst den Namen und spaeter Spam meldet, meldet zweierlei.
  constraint user_reports_once unique (reporter_id, reported_id, reason)
);

comment on table public.user_reports is 'Von Nutzern gemeldete Nutzer samt Begruendung.';

create index user_reports_reported_idx on public.user_reports (reported_id, created_at desc);
create index user_reports_status_idx on public.user_reports (status, created_at desc);

alter table public.user_reports enable row level security;

-- Wie bei den Fragen: anlegen und die eigenen lesen. Wer gemeldet wurde,
-- erfaehrt davon nichts – sonst waere Melden eine Nachricht an den Gemeldeten.
create policy "user_reports: users read own"
  on public.user_reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

create policy "user_reports: users insert own"
  on public.user_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()) and reported_id <> (select auth.uid()));

grant select, insert on public.user_reports to authenticated;

-- Blockieren -----------------------------------------------------------------

create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

comment on table public.user_blocks is 'Wer wen blockiert hat. Wirkt in beide Richtungen.';

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- Nur die eigene Liste, und nur die eigenen Eintraege. Wer blockiert wurde,
-- soll das nicht abfragen koennen.
create policy "user_blocks: users read own"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "user_blocks: users insert own"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));

create policy "user_blocks: users delete own"
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

grant select, insert, delete on public.user_blocks to authenticated;

/**
 * Ob zwischen zwei Nutzern eine Blockade steht – egal, wer sie gesetzt hat.
 *
 * Beidseitig: wer jemanden blockiert, will ihn nicht sehen, und wer blockiert
 * wurde, soll keinen Weg zurueck finden. Eine einseitige Sperre waere fuer den
 * Blockierten sofort erkennbar und fuer den Blockierenden nutzlos.
 */
create or replace function public.is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

comment on function public.is_blocked(uuid, uuid) is
  'True when either of the two has blocked the other.';

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

/**
 * Blockiert jemanden und raeumt dabei auf.
 *
 * Eine bestehende Freundschaft wird geloescht, samt offener Anfrage in beide
 * Richtungen – ein Freund, der nichts mehr darf, ist keiner, und eine Anfrage,
 * die nicht mehr beantwortet werden kann, ist ein Zettel im Nirgendwo.
 *
 * Gemeinsame Duelle und Nachrichten bleiben stehen. Sie sind Vergangenheit,
 * und Vergangenheit wird nicht geloescht, nur weil zwei sich zerstritten haben.
 */
create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null or p_user_id is null or p_user_id = v_me then
    raise exception 'invalid block' using errcode = 'check_violation';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_me, p_user_id)
  on conflict do nothing;

  delete from public.friendships f
  where (f.requester_id = v_me and f.addressee_id = p_user_id)
     or (f.requester_id = p_user_id and f.addressee_id = v_me);
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;

/** Hebt die eigene Blockade auf. Die Freundschaft kommt dadurch nicht zurueck. */
create or replace function public.unblock_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.user_blocks b
  where b.blocker_id = auth.uid() and b.blocked_id = p_user_id;
$$;

grant execute on function public.unblock_user(uuid) to authenticated;

/** Wen ich blockiert habe – fuer die Liste in den Einstellungen. */
create or replace function public.get_my_blocks()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_config jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_config, b.created_at
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

grant execute on function public.get_my_blocks() to authenticated;

-- Wo die Blockade greift -----------------------------------------------------

-- Suche: Blockierte tauchen nicht mehr auf, in keiner der beiden Richtungen.
-- Sonst waere die Sperre eine Einladung, es noch einmal zu versuchen.
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
    and not public.is_blocked(p.id, auth.uid())
  order by p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.search_users(text, integer) to authenticated;

-- Freundschaftsanfrage: geht nicht mehr durch. Die Meldung nennt keinen Grund –
-- wer blockiert wurde, muss nicht erfahren, dass er es wurde.
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
begin
  if v_me is null or p_user_id = v_me then
    raise exception 'invalid friend request' using errcode = 'check_violation';
  end if;

  if public.is_blocked(v_me, p_user_id) then
    raise exception 'Diese Anfrage ist nicht möglich.' using errcode = 'check_violation';
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
