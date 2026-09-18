-- =============================================================================
-- QuizByte – gelesene Chats
--
-- Der Freunde-Tab soll sagen, wo etwas Neues liegt. Dafuer reicht ein
-- Zeitstempel je Unterhaltung: alles, was danach vom Gegenueber kam, ist
-- ungelesen. Keine Flag je Nachricht – die waere bei jedem Oeffnen ein Schreib-
-- vorgang pro Nachricht statt einem pro Chat.
-- =============================================================================

create table public.friend_chat_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friend_chat_reads_no_self check (user_id <> friend_id)
);

comment on table public.friend_chat_reads is 'Wann ich den Chat mit diesem Freund zuletzt geoeffnet habe.';

alter table public.friend_chat_reads enable row level security;

create policy "friend_chat_reads: own rows"
  on public.friend_chat_reads for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.friend_chat_reads to authenticated;

-- Als gelesen markieren --------------------------------------------------------------

create or replace function public.mark_conversation_read(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.are_friends(auth.uid(), p_friend_id) then
    raise exception 'not friends';
  end if;

  insert into public.friend_chat_reads (user_id, friend_id, last_read_at)
  values (auth.uid(), p_friend_id, now())
  on conflict (user_id, friend_id) do update set last_read_at = now();
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Wie viel ist neu ------------------------------------------------------------------
-- Nur Chats mit etwas Ungelesenem kommen zurueck; wer nichts hat, steht nicht drin.

create or replace function public.get_unread_counts()
returns table (
  friend_id uuid,
  unread integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.sender_id,
    count(*)::integer
  from public.friend_messages m
  left join public.friend_chat_reads r
    on r.user_id = auth.uid() and r.friend_id = m.sender_id
  where m.recipient_id = auth.uid()
    -- Ohne Eintrag ist noch nie etwas gelesen worden: dann zaehlt alles.
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  group by m.sender_id;
$$;

grant execute on function public.get_unread_counts() to authenticated;
