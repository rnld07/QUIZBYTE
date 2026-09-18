-- =============================================================================
-- QuizByte – Feature-Schalter, die nicht im Bundle stehen
--
-- Bisher stehen die Schalter in `packages/shared/src/config/features.ts`. Das
-- ist der richtige Ort fuer die Voreinstellung – die App muss auch ohne Netz
-- wissen, was es gibt –, aber ein Schalter, der erst mit dem naechsten Release
-- umgelegt werden kann, ist im Zweifel keiner.
--
-- Deshalb hier eine Tabelle daneben: sie ueberschreibt die Voreinstellung,
-- wenn ein Eintrag da ist, und wird sonst ignoriert. Kein zweites System, nur
-- eine Ausnahme vom ersten.
--
-- Lesen darf jeder Angemeldete – die App muss die Schalter kennen. Schreiben
-- darf nur ein Admin.
-- =============================================================================

create table if not exists public.feature_flags (
  -- Derselbe Schluessel wie in `features.ts`. Keine Fremdschluesselpruefung
  -- moeglich, deshalb steht die Liste im Panel und nicht als freies Textfeld.
  key text primary key,
  enabled boolean not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.feature_flags is
  'Server-side overrides for the flags in packages/shared/src/config/features.ts.';

alter table public.feature_flags enable row level security;

drop policy if exists "feature flags readable" on public.feature_flags;
create policy "feature flags readable"
  on public.feature_flags for select
  to authenticated
  using (true);

-- Geschrieben wird ausschliesslich ueber die Funktion unten; direkte Schreib-
-- rechte gibt es nicht, auch nicht fuer Admins.
drop policy if exists "feature flags admin write" on public.feature_flags;


/** Alle gesetzten Ueberschreibungen. Ohne Eintrag gilt die Voreinstellung. */
create or replace function public.get_feature_flags()
returns table (key text, enabled boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select f.key, f.enabled from public.feature_flags f;
$$;

grant execute on function public.get_feature_flags() to authenticated, anon;


/**
 * Legt einen Schalter um.
 *
 * `p_enabled = null` loescht die Ueberschreibung – dann gilt wieder, was im
 * Code steht. Das ist der Weg zurueck, und ohne ihn haette eine einmal
 * gesetzte Zeile fuer immer Vorrang.
 */
create or replace function public.admin_set_feature_flag(
  p_key text,
  p_enabled boolean,
  p_note text default null
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

  if btrim(coalesce(p_key, '')) = '' then
    raise exception 'flag key missing' using errcode = 'invalid_parameter_value';
  end if;

  if p_enabled is null then
    delete from public.feature_flags where key = p_key;
    perform public.log_admin_action('set_feature_flag', p_key || ' → Standard');
    return;
  end if;

  insert into public.feature_flags (key, enabled, note, updated_at, updated_by)
  values (p_key, p_enabled, coalesce(p_note, ''), now(), auth.uid())
  on conflict (key) do update
    set enabled = excluded.enabled,
        note = excluded.note,
        updated_at = now(),
        updated_by = excluded.updated_by;

  perform public.log_admin_action('set_feature_flag', p_key || ' → ' || case when p_enabled then 'an' else 'aus' end);
end;
$$;

grant execute on function public.admin_set_feature_flag(text, boolean, text) to authenticated;


/** Die Schalter mit allem, was das Panel dazu anzeigt. */
create or replace function public.admin_list_feature_flags()
returns table (
  key text,
  enabled boolean,
  note text,
  updated_at timestamptz,
  updated_by_username text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  return query
  select f.key, f.enabled, f.note, f.updated_at, p.username
  from public.feature_flags f
  left join public.profiles p on p.id = f.updated_by
  order by f.key;
end;
$$;

grant execute on function public.admin_list_feature_flags() to authenticated;
