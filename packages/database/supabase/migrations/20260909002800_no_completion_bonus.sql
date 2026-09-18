-- =============================================================================
-- QuizByte – kein Bonus mehr fürs Abschließen einer Runde
--
-- XP gibt es ab jetzt ausschließlich für richtig beantwortete Fragen. Der
-- Abschlussbonus fällt weg: Er belohnte das Durchklicken statt des Wissens und
-- verzerrte im Daily Quiz zusätzlich die Rechnung, weil er verdoppelt wurde.
--
-- Die Funktion bleibt bestehen und liefert 0 – so bleiben `complete_quiz_session`
-- und die Zusammenfassungen unverändert, und ein Bonus ließe sich später mit
-- einer einzigen Zeile wieder einschalten.
--
-- Gegenstück in `packages/shared/src/config/xp.ts`: SESSION_COMPLETION_XP.
-- =============================================================================

create or replace function public.xp_for_session_completion()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 0;
$$;

comment on function public.xp_for_session_completion() is
  'Bonus XP per completed session – derzeit 0. Keep in sync with xpConfig in packages/shared.';
