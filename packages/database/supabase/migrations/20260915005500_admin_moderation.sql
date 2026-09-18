-- =============================================================================
-- QuizByte – Moderation im Adminpanel
--
-- Drei Dinge:
--   1. gemeldete Nutzer sichtbar machen und abhaken
--   2. einen Nutzer sperren, entsperren, oder nur seinen Namen zuruecksetzen
--   3. festhalten, wer was getan hat
--
-- Die Sperre steht in `profiles.suspended_at`. Sie wirkt nicht, weil die App sie
-- respektiert – sie wirkt, weil die Policies und die Funktionen sie pruefen: ein
-- gesperrtes Konto kann keine Antwort mehr speichern, keine Runde anlegen,
-- keinen Namen aendern, niemanden anfragen und niemanden melden. Was es noch
-- darf, ist lesen und sich abmelden.
-- =============================================================================

alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text check (suspended_reason is null or char_length(suspended_reason) <= 500);

comment on column public.profiles.suspended_at is 'When an admin suspended this account. Null means active.';

create index if not exists profiles_suspended_idx on public.profiles (suspended_at) where suspended_at is not null;

/**
 * Ob ein Konto gesperrt ist.
 *
 * `security definer`, weil die Policies damit auch ueber fremde Zeilen urteilen
 * muessen – sonst koennte sich ein gesperrtes Konto durch eine Zeile schreiben,
 * die es selbst nicht lesen darf.
 */
create or replace function public.is_suspended(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.suspended_at is not null
  );
$$;

comment on function public.is_suspended(uuid) is 'True when the account is suspended by an admin.';

grant execute on function public.is_suspended(uuid) to authenticated;

-- Wo die Sperre greift -------------------------------------------------------

-- Spielen: keine neuen Runden, keine neuen Antworten. Gelesen werden darf
-- weiter, damit die App nicht in Fehlermeldungen zerfaellt.
drop policy if exists "quiz_sessions: users create own sessions" on public.quiz_sessions;
create policy "quiz_sessions: users create own sessions"
  on public.quiz_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()) and not public.is_suspended());

drop policy if exists "quiz_attempts: users create own attempts" on public.quiz_attempts;
create policy "quiz_attempts: users create own attempts"
  on public.quiz_attempts for insert
  to authenticated
  with check (user_id = (select auth.uid()) and not public.is_suspended());

-- Melden: ein gesperrtes Konto meldet niemanden mehr.
drop policy if exists "user_reports: users insert own" on public.user_reports;
create policy "user_reports: users insert own"
  on public.user_reports for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_id <> (select auth.uid())
    and not public.is_suspended()
  );

-- Namen aendern: ebenfalls nicht. Der Rest des Profils (Avatar, Rahmen) bleibt
-- erlaubt – daran haengt niemand anderes.
drop policy if exists "profiles: users update own profile" on public.profiles;
create policy "profiles: users update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.guard_suspended_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username
     and old.suspended_at is not null
     and not public.is_admin()
  then
    raise exception 'Dieses Konto ist gesperrt.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_suspended_username on public.profiles;
create trigger profiles_guard_suspended_username
  before update of username on public.profiles
  for each row execute function public.guard_suspended_username();

-- Was ein Admin getan hat ----------------------------------------------------

create type public.admin_action_kind as enum (
  'suspend_user',
  'unsuspend_user',
  'reset_username',
  'resolve_report'
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete set null,
  kind public.admin_action_kind not null,
  -- Was genau passiert ist: der alte Name, der Grund, die Report-ID.
  details text not null default '' check (char_length(details) <= 1000),
  created_at timestamptz not null default now()
);

comment on table public.admin_actions is 'Audit trail of moderation actions. Written by the admin RPCs, never by hand.';

create index admin_actions_target_idx on public.admin_actions (target_user_id, created_at desc);
create index admin_actions_created_idx on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

-- Nur Admins, und nur lesend: geschrieben wird ausschliesslich aus den
-- Funktionen unten, damit kein Eintrag entstehen kann, der nichts bewirkt hat.
create policy "admin_actions: admins read"
  on public.admin_actions for select
  to authenticated
  using (public.is_admin());

grant select on public.admin_actions to authenticated;

-- Admins duerfen die Meldungen sehen -----------------------------------------

create policy "user_reports: admins read all"
  on public.user_reports for select
  to authenticated
  using (public.is_admin());

create policy "user_reports: admins update status"
  on public.user_reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update on public.user_reports to authenticated;

-- Die Werkzeuge --------------------------------------------------------------

/** Sperrt ein Konto und haelt fest, wer das wann und warum getan hat. */
create or replace function public.admin_suspend_user(p_user_id uuid, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Du kannst dich nicht selbst sperren.' using errcode = 'check_violation';
  end if;

  update public.profiles
  set suspended_at = now(), suspended_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_user_id;

  insert into public.admin_actions (admin_id, target_user_id, kind, details)
  values (auth.uid(), p_user_id, 'suspend_user', coalesce(p_reason, ''));
end;
$$;

create or replace function public.admin_unsuspend_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.profiles
  set suspended_at = null, suspended_reason = null
  where id = p_user_id;

  insert into public.admin_actions (admin_id, target_user_id, kind, details)
  values (auth.uid(), p_user_id, 'unsuspend_user', '');
end;
$$;

/**
 * Setzt einen Namen auf einen neutralen zurueck.
 *
 * Fuer den haeufigsten Fall: der Name ist das Problem, der Mensch dahinter
 * nicht. `generate_username` liefert denselben Platzhalter wie bei einer
 * Registrierung ohne Wunschnamen.
 */
create or replace function public.admin_reset_username(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
  v_new text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select username into v_old from public.profiles where id = p_user_id;
  if v_old is null then
    raise exception 'Unbekannter Nutzer.' using errcode = 'no_data_found';
  end if;

  v_new := public.generate_username(p_user_id);
  update public.profiles set username = v_new where id = p_user_id;

  insert into public.admin_actions (admin_id, target_user_id, kind, details)
  values (auth.uid(), p_user_id, 'reset_username', v_old || ' → ' || v_new);

  return v_new;
end;
$$;

/** Hakt eine Meldung ab. */
create or replace function public.admin_set_report_status(p_report_id uuid, p_status public.report_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.user_reports
  set status = p_status
  where id = p_report_id
  returning reported_id into v_target;

  if v_target is null then
    raise exception 'Unbekannte Meldung.' using errcode = 'no_data_found';
  end if;

  insert into public.admin_actions (admin_id, target_user_id, kind, details)
  values (auth.uid(), v_target, 'resolve_report', p_status::text);
end;
$$;

/**
 * Die Meldungen, wie das Adminpanel sie braucht.
 *
 * Mit beiden Namen dabei: das Panel kann `profiles` zwar lesen, aber zwei
 * Nachschlaege pro Zeile waeren eine Abfrage pro Meldung.
 */
create or replace function public.admin_list_user_reports(p_status public.report_status default null)
returns table (
  id uuid,
  reason public.user_report_reason,
  details text,
  status public.report_status,
  created_at timestamptz,
  reporter_id uuid,
  reporter_username text,
  reported_id uuid,
  reported_username text,
  reported_suspended_at timestamptz,
  reported_report_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.reason,
    r.details,
    r.status,
    r.created_at,
    r.reporter_id,
    reporter.username,
    r.reported_id,
    reported.username,
    reported.suspended_at,
    (select count(*) from public.user_reports x where x.reported_id = r.reported_id)::integer
  from public.user_reports r
  join public.profiles reporter on reporter.id = r.reporter_id
  join public.profiles reported on reported.id = r.reported_id
  where public.is_admin()
    and (p_status is null or r.status = p_status)
  order by r.created_at desc
  limit 200;
$$;

grant execute on function public.admin_suspend_user(uuid, text) to authenticated;
grant execute on function public.admin_unsuspend_user(uuid) to authenticated;
grant execute on function public.admin_reset_username(uuid) to authenticated;
grant execute on function public.admin_set_report_status(uuid, public.report_status) to authenticated;
grant execute on function public.admin_list_user_reports(public.report_status) to authenticated;
