-- =============================================================================
-- QuizByte – Ergebnisfelder gehoeren dem Server
--
-- Beim Aufraeumen der Moderationsregeln (20260915005500) ist die INSERT-Regel
-- auf `quiz_sessions` neu geschrieben worden – und dabei sind drei Bedingungen
-- verlorengegangen, die vorher darin standen:
--
--   completed_at is null and correct_answers = 0 and xp_earned = 0
--
-- Seitdem kann ein Client eine Runde gleich fertig und bezahlt anlegen.
--
-- Die naheliegende Reparatur waere, die Bedingungen in die Regel
-- zurueckzuschreiben. Das ist richtig, reicht aber nicht als Nachweis:
-- Zeilensicherheit und Spaltenrechte sind in PostgreSQL zwei verschiedene
-- Dinge, und nur das zweite kann sagen "diese Spalte darfst du gar nicht erst
-- nennen". Deshalb drei Ebenen:
--
--   1. Spaltenrechte  – `xp_earned` laesst sich nicht mehr einfuegen. Der Fehler
--                       kommt als 42501, bevor irgendeine Regel geprueft wird.
--   2. Trigger        – setzt die Felder beim Einfuegen hart auf ihre neutralen
--                       Werte und verbietet jede spaetere Aenderung daran.
--                       Greift auch, falls jemand die Rechte wieder ausweitet.
--   3. Regel          – die verlorenen Bedingungen, zurueck an ihrem Platz.
--
-- Was dabei auffiel und den Bericht ergaenzt: ein UPDATE-Recht auf
-- `quiz_sessions` hat `authenticated` ohnehin nie gehabt (20260909000500:110
-- vergibt nur `select, insert`). Eine UPDATE-Regel waere also ein Nachweis
-- ueber etwas gewesen, das schon am Tabellenrecht scheitert. Die Luecke sass
-- beim INSERT.
-- =============================================================================

-- --- 1. Spaltenrechte ---------------------------------------------------------
-- Die Liste ist genau das, was der Client heute schickt (sessionsApi.ts).
-- Alles andere – Ergebnis, Zeitpunkte, Zaehler – kommt aus Defaults oder vom
-- Server.

revoke insert on public.quiz_sessions from authenticated;
grant insert (user_id, category_id, session_type, mode, total_questions)
  on public.quiz_sessions to authenticated;

revoke insert on public.quiz_attempts from authenticated;
grant insert (user_id, question_id, quiz_session_id, selected_answer, response_time_ms, answered_on)
  on public.quiz_attempts to authenticated;


-- --- 2. Trigger ---------------------------------------------------------------

/**
 * Haelt die Ergebnisfelder einer Runde in der Hand des Servers.
 *
 * Der Unterschied zwischen "der Client schreibt" und "der Server rechnet ab"
 * ist hier `current_user`: die Wertungsfunktionen sind SECURITY DEFINER und
 * laufen als Eigentuemer, ein Aufruf aus der App laeuft als `authenticated`.
 * Nur der zweite Fall wird beschnitten.
 */
create or replace function public.enforce_session_result_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Alles ausser den API-Rollen ist serverseitig: die Wertungsfunktionen
  -- (SECURITY DEFINER), Migrationen, der Service-Key.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.completed_at := null;
    new.correct_answers := 0;
    new.xp_earned := 0;
    return new;
  end if;

  if new.completed_at is distinct from old.completed_at
    or new.correct_answers is distinct from old.correct_answers
    or new.xp_earned is distinct from old.xp_earned then
    raise exception 'session results are computed by the server'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists quiz_sessions_enforce_result_fields on public.quiz_sessions;
create trigger quiz_sessions_enforce_result_fields
  before insert or update on public.quiz_sessions
  for each row execute function public.enforce_session_result_fields();


-- --- 3. Die Regel, vollstaendig ----------------------------------------------

drop policy if exists "quiz_sessions: users create own sessions" on public.quiz_sessions;
create policy "quiz_sessions: users create own sessions"
  on public.quiz_sessions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_suspended()
    and completed_at is null
    and correct_answers = 0
    and xp_earned = 0
  );
