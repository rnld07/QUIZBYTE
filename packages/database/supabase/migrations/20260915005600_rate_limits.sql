-- =============================================================================
-- QuizByte – Bremsen fuer die Aktionen, die sich missbrauchen lassen
--
-- Gezaehlt wird in den Tabellen, die es ohnehin gibt: eine Freundschaftsanfrage
-- ist eine Zeile in `friendships`, eine Meldung eine in `user_reports`, eine
-- Blockierung eine in `user_blocks`. Eine eigene Zaehl-Tabelle waere ein
-- zweites System mit denselben Daten und einem eigenen Weg, falsch zu liegen.
--
-- Die Grenzen sind so gewaehlt, dass normale Nutzung sie nie sieht: wer an
-- einem Nachmittag zwanzig Leute hinzufuegt, ist keiner, der die App benutzt.
-- =============================================================================

-- Wie oft ein Name geaendert werden darf -------------------------------------

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

comment on column public.profiles.username_changed_at is
  'When the username was last changed. Null for names that were never changed.';

/**
 * Hoechstens eine Namensaenderung pro Tag.
 *
 * Nicht, weil Umbenennen schlimm waere, sondern weil ein Name die Adresse ist,
 * unter der Freunde jemanden kennen: wer ihn stuendlich wechselt, ist entweder
 * niemand, den man wiederfinden soll, oder jemand, der einen gesperrten Namen
 * sucht, bis einer durchrutscht.
 *
 * Admins sind ausgenommen – `admin_reset_username` muss immer koennen.
 */
create or replace function public.guard_username_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and old.username_changed_at > now() - interval '24 hours'
       and not public.is_admin()
    then
      raise exception 'Du kannst deinen Namen nur einmal am Tag ändern. Versuch es später noch einmal.'
        using errcode = 'check_violation';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_username_rate_limit on public.profiles;
create trigger profiles_username_rate_limit
  before update of username on public.profiles
  for each row execute function public.guard_username_rate_limit();

-- Freundschaftsanfragen ------------------------------------------------------

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

  -- Zwanzig in der Stunde. Wer eine Klasse einsammelt, kommt damit durch; wer
  -- die Nutzerliste durchgeht, nicht.
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

-- Meldungen ------------------------------------------------------------------

/**
 * Hoechstens zehn Meldungen am Tag.
 *
 * Dass dieselbe Person nicht zweimal mit demselben Grund gemeldet werden kann,
 * erledigt schon der Unique-Index auf `user_reports`. Hier geht es um den
 * anderen Fall: jemand, der der Reihe nach alle meldet.
 */
create or replace function public.guard_report_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recent integer;
begin
  select count(*) into v_recent
  from public.user_reports r
  where r.reporter_id = new.reporter_id
    and r.created_at > now() - interval '24 hours';

  if v_recent >= 10 then
    raise exception 'Du hast heute schon viele Meldungen geschickt. Versuch es morgen noch einmal.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists user_reports_rate_limit on public.user_reports;
create trigger user_reports_rate_limit
  before insert on public.user_reports
  for each row execute function public.guard_report_rate_limit();

-- Blockieren -----------------------------------------------------------------

/**
 * Hoechstens dreissig Blockierungen in der Stunde.
 *
 * Blockieren schadet niemandem ausser dem, der es tut – aber jede Blockade
 * loescht eine Freundschaft, und das im Sekundentakt ueber eine Liste laufen zu
 * lassen ist kein Gebrauch, den die App unterstuetzen muss.
 */
create or replace function public.guard_block_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recent integer;
begin
  select count(*) into v_recent
  from public.user_blocks b
  where b.blocker_id = new.blocker_id
    and b.created_at > now() - interval '1 hour';

  if v_recent >= 30 then
    raise exception 'Das waren gerade sehr viele auf einmal. Versuch es in einer Stunde noch einmal.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists user_blocks_rate_limit on public.user_blocks;
create trigger user_blocks_rate_limit
  before insert on public.user_blocks
  for each row execute function public.guard_block_rate_limit();
