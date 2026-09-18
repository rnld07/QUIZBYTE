-- =============================================================================
-- QuizByte – ein Duell laesst sich wirklich ablehnen
--
-- Das Kreuz im Chat tat nichts. Der Grund stand in einer Zeile:
--
--   where id = p_duel_id and opponent_id = auth.uid() and status = 'pending'
--
-- 'pending' ist ein Duell aber nur, solange niemand gespielt hat – und wer
-- herausfordert, spielt in aller Regel sofort danach. Bis der Gegner den Chat
-- oeffnet, steht es laengst auf 'active', das UPDATE traf null Zeilen, und weil
-- es kein Fehler ist, null Zeilen zu aendern, kam auch keine Meldung zurueck.
--
-- Abgelehnt werden darf jetzt, solange man selbst noch nicht gespielt hat. Dass
-- der andere schon gespielt hat, ist kein Grund, jemanden zu einer Runde zu
-- verpflichten – und ohne zweite Runde gibt es ohnehin nichts abzurechnen.
--
-- Rueckgabe ist jetzt ein boolean, damit die App den Unterschied zwischen
-- "abgelehnt" und "ging nicht" kennt. `create or replace` kann den Rueckgabetyp
-- nicht aendern, deshalb vorher weg damit.
-- =============================================================================

drop function if exists public.decline_duel(uuid);

create function public.decline_duel(p_duel_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duel public.duels%rowtype;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;

  if not found then
    return false;
  end if;

  -- Nur der Herausgeforderte. Wer selbst herausfordert, nimmt die Einladung
  -- zurueck, indem er sie nicht spielt – ablehnen kann er sie nicht.
  if v_duel.opponent_id <> auth.uid() then
    return false;
  end if;

  if v_duel.status not in ('pending', 'active') then
    return false;
  end if;

  -- Wer schon gespielt hat, hat angenommen.
  if v_duel.opponent_session_id is not null then
    return false;
  end if;

  update public.duels
  set status = 'declined', finished_at = now()
  where id = p_duel_id;

  return true;
end;
$$;

comment on function public.decline_duel(uuid) is
  'The challenged player declines. Works until they have played themselves; returns false when it does not apply.';

grant execute on function public.decline_duel(uuid) to authenticated;
