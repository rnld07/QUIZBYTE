-- =============================================================================
-- QuizByte – wer eine Funktion aufrufen darf, steht jetzt dort
--
-- Jede Migration vergibt sauber `grant execute ... to authenticated`. Das ist
-- aber nur die halbe Aussage: PostgreSQL gibt neuen Funktionen von sich aus
-- EXECUTE fuer PUBLIC, und Supabase setzt zusaetzlich
--
--   alter default privileges in schema public grant all on functions
--     to anon, authenticated, service_role;
--
-- Die Rolle `anon` – der Schluessel, der in jeder App-Installation steckt – kann
-- damit jede dieser Funktionen aufrufen. Bei SECURITY DEFINER wiegt das schwer:
-- die Funktion laeuft mit den Rechten ihres Eigentuemers, waehrend `auth.uid()`
-- NULL ist. Die vorige Migration hat die drei Funktionen abgedichtet, bei denen
-- das unmittelbar Schaden anrichtete; diese hier nimmt der Rolle `anon` den
-- Zugang zu allen uebrigen.
--
-- Eine Ausnahme: `get_feature_flags()` wird vor dem Anmelden gelesen und ist
-- ausdruecklich fuer `anon` gedacht.
--
-- Fuer kuenftige Migrationen gilt ab hier: zu jeder neuen SECURITY-DEFINER-
-- Funktion gehoeren zwei Zeilen, nicht eine –
--
--   revoke all on function public.x(...) from public, anon;
--   grant execute on function public.x(...) to authenticated;
--
-- denn die Vorgabe oben wirkt auch auf alles, was nach dieser Migration
-- entsteht.
-- =============================================================================

do $$
declare
  r record;
  -- Was vor dem Anmelden gebraucht wird.
  v_anon_allowed text[] := array['get_feature_flags'];
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prokind = 'f'
      and not (p.proname = any (v_anon_allowed))
  loop
    execute format('revoke all on function %s from public, anon', r.signature);
  end loop;
end;
$$;


-- --- Das Adminprotokoll ------------------------------------------------------
--
-- `log_admin_action` hatte bereits ein `revoke all ... from public`. Das lief
-- ins Leere, weil die Vorgabe oben `anon` und `authenticated` direkt bedient –
-- ein Entzug von PUBLIC nimmt einer Rolle nichts, die ihr Recht selbst besitzt.
-- Jeder angemeldete Nutzer konnte sich also Eintraege ins Adminprotokoll
-- schreiben, mit `admin_id = auth.uid()`, also auf den eigenen Namen. Ein
-- Protokoll, in das jeder schreiben kann, ist als Beleg wertlos.
--
-- Zwei Aenderungen: die Funktion prueft selbst, ob der Aufrufer Admin ist, und
-- `authenticated` verliert das Ausfuehrungsrecht. Die Admin-Funktionen rufen sie
-- weiterhin auf – sie sind SECURITY DEFINER und laufen als Eigentuemer.

create or replace function public.log_admin_action(
  p_kind public.admin_action_kind,
  p_details text,
  p_target_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  insert into public.admin_actions (admin_id, target_user_id, kind, details)
  values (auth.uid(), p_target_user_id, p_kind, coalesce(p_details, ''));
end;
$$;

comment on function public.log_admin_action(public.admin_action_kind, text, uuid) is
  'Writes one admin audit entry. Admin only, and only reachable from the admin RPCs.';

revoke all on function public.log_admin_action(public.admin_action_kind, text, uuid)
  from public, anon, authenticated;
