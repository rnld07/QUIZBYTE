-- =============================================================================
-- QuizByte – Daily und Duell beginnen auf dem Server
--
-- Der Rundenstart wandert aus dem Client heraus. Statt "Client sucht Fragen,
-- legt Runde an, schickt Antworten" gilt fuer diese beiden Rundenarten:
--
--   start_daily_round()      -> Runde + Fragen, vom Server bestimmt
--   start_duel_round(duell)  -> Runde + Fragen, aus dem Duell, ohne Loesung
--   submit_attempt(...)      -> Antwort speichern und bewerten lassen
--
-- Die Start-Funktionen setzen `question_set_enforced`, halten das Fragenset fest
-- und binden im Duell die Runde gleich an die richtige Seite. Damit stimmen
-- Eigentuemer, Typ, Modus und Fragenzahl von vornherein – geprueft werden muss
-- nichts mehr, weil nichts mehr behauptet wird.
--
-- Zwei Dinge, die hier bewusst NICHT passieren:
--
--   * Der alte Weg bleibt offen. `join_duel` und der direkte INSERT in
--     `quiz_sessions` funktionieren weiter, sonst braechen alle Installationen,
--     die noch nicht aktualisiert sind. Sie werden in einem eigenen Release
--     geschlossen (siehe Abschaltplan im Plan).
--   * `duel_question_count(mode)` wird nicht gegen die gespeicherte Laenge von
--     `duels.question_ids` geprueft. Duelle aus der Zeit vor 20260917006200
--     haben fuenf Fragen in allen Modi; eine solche Pruefung wuerde laufende
--     Altduelle abwuergen.
--
-- Was `start_duel_round` ausdruecklich nicht tut: zurueckgezogene Fragen aus dem
-- Duellsatz entfernen. Beide Seiten bekommen denselben Satz, und ein Satz, der
-- sich zwischen den beiden Starts aendert, waere unfair. Dass eine inzwischen
-- archivierte Frage dann nicht beantwortbar ist, ist ein alter Fehler mit einer
-- eigenen Loesung: Frageversionen je Runde (Paket 6).
-- =============================================================================

-- --- Die Rueckgabe -----------------------------------------------------------
-- Eine Runde und ihre Fragen in einem Aufruf. Intern: aufgerufen wird sie nur
-- von den Start-Funktionen, und die laufen als Eigentuemer.

create or replace function public.session_start_payload(p_session_id uuid, p_mask_answers boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'session_id', p_session_id,
    'questions', coalesce((
      select jsonb_agg(
        case
          when p_mask_answers then to_jsonb(q) - 'correct_answer' - 'explanation'
          else to_jsonb(q)
        end
        order by sq.sort_position
      )
      from public.quiz_session_questions sq
      join public.questions q on q.id = sq.question_id
      where sq.quiz_session_id = p_session_id
    ), '[]'::jsonb)
  );
$$;

comment on function public.session_start_payload(uuid, boolean) is
  'Session id plus its questions. With p_mask_answers the solution and the explanation are left out.';

revoke all on function public.session_start_payload(uuid, boolean) from public, anon, authenticated;


-- --- Das Tagesquiz -----------------------------------------------------------

create or replace function public.start_daily_round()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_ids uuid[];
  v_session uuid;
begin
  -- Die Fragen des Tages bestimmt der Server, wie bisher – nur fragt jetzt
  -- nicht mehr der Client danach, sondern die Runde selbst.
  select array_agg(t.id order by t.ordinality)
    into v_ids
  from public.get_daily_questions() with ordinality as t;

  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'no questions available' using errcode = 'no_data_found';
  end if;

  insert into public.quiz_sessions (user_id, session_type, mode, total_questions, question_set_enforced)
  values (v_me, 'daily', 'classic', array_length(v_ids, 1), true)
  returning id into v_session;

  insert into public.quiz_session_questions (quiz_session_id, question_id, sort_position)
  select v_session, u.id, u.pos
  from unnest(v_ids) with ordinality as u(id, pos);

  return public.session_start_payload(v_session, false);
end;
$$;

comment on function public.start_daily_round() is
  'Starts today''s daily round: server-chosen questions, fixed as the round''s question set.';

revoke all on function public.start_daily_round() from public, anon;
grant execute on function public.start_daily_round() to authenticated;


-- --- Das Duell ---------------------------------------------------------------

create or replace function public.start_duel_round(p_duel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_duel public.duels%rowtype;
  v_is_challenger boolean;
  v_session uuid;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found then
    raise exception 'duel not found' using errcode = 'no_data_found';
  end if;

  if v_duel.status in ('finished', 'declined') then
    raise exception 'duel is closed' using errcode = 'check_violation';
  end if;

  if now() > v_duel.created_at + make_interval(days => public.duel_deadline_days()) then
    raise exception 'duel has expired' using errcode = 'check_violation';
  end if;

  if v_me = v_duel.challenger_id then
    v_is_challenger := true;
  elsif v_me = v_duel.opponent_id then
    v_is_challenger := false;
  else
    raise exception 'not a participant' using errcode = 'insufficient_privilege';
  end if;

  if (v_is_challenger and v_duel.challenger_session_id is not null)
    or (not v_is_challenger and v_duel.opponent_session_id is not null) then
    raise exception 'already played' using errcode = 'check_violation';
  end if;

  insert into public.quiz_sessions (user_id, session_type, mode, total_questions, question_set_enforced)
  values (v_me, 'duel', v_duel.mode, array_length(v_duel.question_ids, 1), true)
  returning id into v_session;

  insert into public.quiz_session_questions (quiz_session_id, question_id, sort_position)
  select v_session, u.id, u.pos
  from unnest(v_duel.question_ids) with ordinality as u(id, pos);

  if v_is_challenger then
    update public.duels set challenger_session_id = v_session, status = 'active' where id = p_duel_id;
  else
    update public.duels set opponent_session_id = v_session, status = 'active' where id = p_duel_id;
  end if;

  -- Ohne Loesung und ohne Erklaerung: im Duell sagt erst die Abgabe, ob es
  -- richtig war. Was danach bleibt, steht im Plan unter "Der gemeinsame
  -- Fragenbestand" – es ist weniger, als es aussieht, und es ist benannt.
  return public.session_start_payload(v_session, true);
end;
$$;

comment on function public.start_duel_round(uuid) is
  'Starts the caller''s side of a duel: binds the round to the duel and returns the questions without the solution.';

revoke all on function public.start_duel_round(uuid) from public, anon;
grant execute on function public.start_duel_round(uuid) to authenticated;


-- --- Der alte Weg, so eng wie er noch geht -----------------------------------
--
-- `join_duel` bekommt nach, was ihm fehlte: dass die Runde dem Aufrufer gehoert,
-- ein Duell ist, noch laeuft, noch keine Antwort hat und noch keinem Duell
-- zugeordnet ist. Ohne das konnte man eine beliebige eigene Runde – auch eine
-- laengst gespielte Kategorie-Runde mit lauter richtigen Antworten – als
-- Duellrunde eintragen.

create or replace function public.join_duel(p_duel_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_duel public.duels%rowtype;
  v_session public.quiz_sessions%rowtype;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found then
    raise exception 'duel not found' using errcode = 'no_data_found';
  end if;

  if v_duel.status in ('finished', 'declined') then
    raise exception 'duel is closed' using errcode = 'check_violation';
  end if;

  if now() > v_duel.created_at + make_interval(days => public.duel_deadline_days()) then
    raise exception 'duel has expired' using errcode = 'check_violation';
  end if;

  select * into v_session from public.quiz_sessions where id = p_session_id;
  if not found or v_session.user_id is distinct from v_me then
    raise exception 'quiz session not found' using errcode = 'no_data_found';
  end if;
  if v_session.session_type <> 'duel' then
    raise exception 'not a duel round' using errcode = 'check_violation';
  end if;
  if v_session.completed_at is not null then
    raise exception 'round is already finished' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.quiz_attempts a where a.quiz_session_id = p_session_id) then
    raise exception 'round has already been played' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.duels d
    where d.challenger_session_id = p_session_id or d.opponent_session_id = p_session_id
  ) then
    raise exception 'round already belongs to a duel' using errcode = 'unique_violation';
  end if;

  if v_me = v_duel.challenger_id then
    if v_duel.challenger_session_id is not null then
      raise exception 'already played' using errcode = 'check_violation';
    end if;
    update public.duels set challenger_session_id = p_session_id, status = 'active' where id = p_duel_id;
  elsif v_me = v_duel.opponent_id then
    if v_duel.opponent_session_id is not null then
      raise exception 'already played' using errcode = 'check_violation';
    end if;
    update public.duels set opponent_session_id = p_session_id, status = 'active' where id = p_duel_id;
  else
    raise exception 'not a participant' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

revoke all on function public.join_duel(uuid, uuid) from public, anon;
grant execute on function public.join_duel(uuid, uuid) to authenticated;


-- --- Eine Antwort abgeben ----------------------------------------------------
--
-- Bisher ein direkter INSERT mit `returning`. Das reicht nicht mehr, sobald die
-- Frage ohne Loesung ausgeliefert wird: die App braucht nach der Abgabe beides –
-- die Bewertung *und* die Erklaerung –, und `returning` kann nur Spalten der
-- eingefuegten Zeile liefern.
--
-- Nebenbei wird der Versand damit wirklich idempotent. Ein zweiter Versuch mit
-- derselben Frage lief bisher in den Unique-Verstoss, den die App als "schon
-- gespeichert" wegwarf – und verlor dabei das Ergebnis. Hier kommt beim zweiten
-- Mal dasselbe zurueck wie beim ersten.

create or replace function public.submit_attempt(
  p_session_id uuid,
  p_question_id uuid,
  p_answer public.answer_key,
  p_response_time_ms integer default 0,
  p_answered_on date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_signed_in_user();
  v_session public.quiz_sessions%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_question public.questions%rowtype;
begin
  select * into v_session from public.quiz_sessions where id = p_session_id;
  if not found or v_session.user_id is distinct from v_me then
    raise exception 'quiz session not found' using errcode = 'no_data_found';
  end if;

  insert into public.quiz_attempts (
    user_id, question_id, quiz_session_id, selected_answer, response_time_ms, answered_on
  )
  values (
    v_me,
    p_question_id,
    p_session_id,
    p_answer,
    least(greatest(coalesce(p_response_time_ms, 0), 0), 3600000),
    coalesce(p_answered_on, (now() at time zone 'utc')::date)
  )
  on conflict (quiz_session_id, question_id) do nothing
  returning * into v_attempt;

  -- Schon gespeichert: dasselbe Ergebnis wie beim ersten Mal.
  if v_attempt.id is null then
    select * into v_attempt
    from public.quiz_attempts
    where quiz_session_id = p_session_id and question_id = p_question_id;
  end if;

  select * into v_question from public.questions where id = p_question_id;

  return jsonb_build_object(
    'question_id', v_attempt.question_id,
    'selected_answer', v_attempt.selected_answer,
    'is_correct', v_attempt.is_correct,
    'response_time_ms', v_attempt.response_time_ms,
    'xp_earned', v_attempt.xp_earned,
    'correct_answer', v_question.correct_answer,
    'explanation', v_question.explanation
  );
end;
$$;

comment on function public.submit_attempt(uuid, uuid, public.answer_key, integer, date) is
  'Stores one answer and returns the verdict together with the solution. Repeating it returns the first result.';

revoke all on function public.submit_attempt(uuid, uuid, public.answer_key, integer, date) from public, anon;
grant execute on function public.submit_attempt(uuid, uuid, public.answer_key, integer, date) to authenticated;
