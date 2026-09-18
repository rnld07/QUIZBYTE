-- =============================================================================
-- QuizByte – ungelesene Nachrichten von Ex-Freunden, und ein ehrliches Entsperren
--
-- Zwei Fehler:
--
-- 1. `get_unread_counts` zaehlt jede Nachricht, die je an mich ging – auch von
--    jemandem, der laengst kein Freund mehr ist. Nach einer Blockierung stand
--    im Freundetab weiter "(2) ungelesene Nachrichten", waehrend die Zeile, zu
--    der sie gehoerten, verschwunden war. Der Zaehler fragt jetzt nach, ob die
--    Freundschaft ueberhaupt noch besteht.
--
-- 2. `unblock_user` gab nichts zurueck. Ob die Blockade wirklich weg ist oder
--    ob gar keine da war, sah in der App gleich aus – und wer von der
--    Gegenseite blockiert wurde, kann daran nichts aendern, denn die Sperre
--    gehoert dem anderen. Die Funktion sagt jetzt, ob sie etwas entfernt hat.
-- =============================================================================

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
    -- Nur von Leuten, die noch in der Liste stehen. Eine Zahl ohne Zeile,
    -- auf die man tippen koennte, ist keine Nachricht, sondern ein Rest.
    and public.are_friends(m.sender_id, auth.uid())
  group by m.sender_id;
$$;

grant execute on function public.get_unread_counts() to authenticated;

/**
 * Hebt die eigene Blockade auf.
 *
 * Gibt zurueck, ob tatsaechlich eine entfernt wurde. `false` heisst: von mir aus
 * war keine da – dann steht die Sperre auf der anderen Seite, und nur der
 * andere kann sie loesen. Ohne diese Antwort sah beides in der App gleich aus.
 *
 * Die Freundschaft kommt dadurch nicht zurueck.
 */

-- Erst weg, dann neu: `create or replace` darf den Rueckgabetyp nicht aendern,
-- und die alte Fassung gab `void` zurueck.
drop function if exists public.unblock_user(uuid);

create function public.unblock_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removed integer;
begin
  delete from public.user_blocks b
  where b.blocker_id = auth.uid() and b.blocked_id = p_user_id;

  get diagnostics v_removed = row_count;
  return v_removed > 0;
end;
$$;

grant execute on function public.unblock_user(uuid) to authenticated;

/**
 * Ob **ich** diese Person blockiert habe.
 *
 * Im Unterschied zu `is_blocked`, das in beide Richtungen schaut: die App muss
 * unterscheiden koennen zwischen "ich habe blockiert" (entsperrbar) und "ich
 * wurde blockiert" (nicht meine Entscheidung).
 */
create or replace function public.blocked_by_me(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where b.blocker_id = auth.uid() and b.blocked_id = p_user_id
  );
$$;

grant execute on function public.blocked_by_me(uuid) to authenticated;
