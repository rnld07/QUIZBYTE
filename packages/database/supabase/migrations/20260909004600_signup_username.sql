-- =============================================================================
-- QuizByte – Wunschname bei der Registrierung
--
-- Seit die App eine Anmeldung verlangt, gibt man bei der Registrierung einen
-- Benutzernamen an. Der kann aber nicht danach gesetzt werden: steht die
-- E-Mail-Bestaetigung an, gibt es zwischen Registrierung und erster Sitzung
-- keinen Moment, in dem der Client schreiben koennte.
--
-- Also nimmt der Trigger ihn entgegen – als `username` in den Metadaten der
-- Registrierung. Passt er nicht oder ist er vergeben, bleibt es beim erzeugten
-- Namen: eine Registrierung darf nicht an einem Namen scheitern, den man
-- hinterher im Profil aendern kann.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wanted text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_username text;
begin
  -- Dieselbe Regel wie der Check-Constraint und validateUsername() im Client.
  if v_wanted ~ '^[a-z0-9_](\.?[a-z0-9_])*$'
     and char_length(v_wanted) between 3 and 20
     and not exists (select 1 from public.profiles p where lower(p.username) = v_wanted)
  then
    v_username := v_wanted;
  else
    v_username := public.generate_username(new.id);
  end if;

  insert into public.profiles (id, username, display_name, is_anonymous)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.is_anonymous, false)
  );

  insert into public.user_progress (user_id) values (new.id);
  return new;
end;
$$;
