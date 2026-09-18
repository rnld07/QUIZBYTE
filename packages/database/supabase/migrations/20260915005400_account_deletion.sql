-- =============================================================================
-- QuizByte – Konto loeschen
--
-- Ein Nutzer soll sein Konto selbst loeschen koennen, ohne uns zu schreiben.
--
-- Der Loeschvorgang ist eine einzige Zeile: alles, was zu einer Person gehoert,
-- haengt per Fremdschluessel an `auth.users` und ist mit `on delete cascade`
-- angelegt – Profil, Fortschritt, Sitzungen, Antworten, Freundschaften,
-- Nachrichten, Duelle, Meldungen, Blockierungen. Wird die Zeile in `auth.users`
-- geloescht, geht das alles mit, und zwar in einer Transaktion. Etwas von Hand
-- nachzuraeumen waere die Gelegenheit, eine Tabelle zu vergessen.
--
-- Was **nicht** mitgeht, ist Inhalt: `questions.created_by` und
-- `study_sheets.created_by` sind `on delete set null`. Eine Frage gehoert der
-- App, nicht ihrem Autor, und sie mit dem Konto zu loeschen wuerde das Quiz
-- fuer alle anderen beschaedigen.
--
-- Die App fragt vorher nach dem Passwort. Das kann nur sie – hier unten ist die
-- Sitzung bereits als echt erwiesen.
-- =============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  -- Ein Admin-Konto ueber die App zu loeschen waere ein Weg, sich selbst aus
  -- dem Adminpanel auszusperren. Das geht nur ueber Supabase direkt.
  if exists (select 1 from public.profiles p where p.id = v_me and p.role = 'admin') then
    raise exception 'Ein Admin-Konto kann nicht in der App gelöscht werden.'
      using errcode = 'check_violation';
  end if;

  delete from auth.users where id = v_me;
end;
$$;

comment on function public.delete_my_account() is
  'Deletes the signed-in user and, by cascade, everything personal attached to them.';

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
