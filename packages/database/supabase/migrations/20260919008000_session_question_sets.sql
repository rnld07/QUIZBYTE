-- =============================================================================
-- QuizByte – eine Runde weiss, aus welchen Fragen sie besteht
--
-- Bisher weiss sie es nicht. Der Client sucht die Fragen aus, legt die Runde per
-- INSERT an und schickt danach Antworten. Der Server kann deshalb nur pruefen,
-- ob es die Frage *gibt* – nicht, ob sie zu dieser Runde *gehoert*. Damit laesst
-- sich eine Daily-Runde mit beliebigen leichten Fragen fuellen, ein Duell mit
-- anderen Fragen spielen als der Gegner, und eine Runde beliebig verlaengern.
--
-- Diese Migration legt den Platz dafuer an und macht die Pruefung scharf – aber
-- nur fuer Runden, die sich dazu bekennen. Das ist die Rampe:
--
--   * `question_set_enforced = false` (Vorgabe): alles wie bisher. Laufende
--     Runden, Antworten aus der Offline-Warteschlange und alte App-Versionen
--     merken nichts.
--   * `question_set_enforced = true`: jede Antwort muss im Fragenset stehen.
--     Gesetzt wird das nur von den Start-Funktionen der naechsten Migration.
--
-- Die Rampe hat ein Ende – es steht im Plan unter "Abschaltplan" und ist ein
-- eigener Schritt in einem spaeteren Release, weil er alte Builds bricht.
--
-- Warum eine eigene Tabelle und kein `uuid[]` auf `quiz_sessions`: Der
-- Antwort-Trigger schreibt bei *jeder* Antwort `update quiz_sessions set
-- correct_answers ...` auf dieselbe Zeile. Ein Fragenset daneben hiesse, dass
-- ein Schwierigkeitswechsel genau die Zeile umschreibt, die der Trigger gerade
-- sperrt. Getrennte Zeilen haben dieses Problem nicht, lassen sich mit einem
-- Fremdschluessel versehen und werden per Index gesucht statt per Array-Scan.
-- =============================================================================

create table public.quiz_session_questions (
  quiz_session_id uuid not null references public.quiz_sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  -- Die Reihenfolge kommt vom Server, nicht aus dem Client.
  sort_position smallint not null,
  primary key (quiz_session_id, question_id),
  unique (quiz_session_id, sort_position)
);

comment on table public.quiz_session_questions is
  'The questions one round consists of. Written only by the start functions; never by a client.';

alter table public.quiz_session_questions enable row level security;

create policy "session questions: users read their own"
  on public.quiz_session_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.quiz_sessions s
      where s.id = quiz_session_id and s.user_id = (select auth.uid())
    )
  );

create policy "session questions: admins read all"
  on public.quiz_session_questions for select
  to authenticated
  using (public.is_admin());

-- Lesen ja, schreiben nicht: die Tabelle wird ausschliesslich von den
-- Start-Funktionen gefuellt, und die laufen als Eigentuemer.
grant select on public.quiz_session_questions to authenticated;


alter table public.quiz_sessions
  add column question_set_enforced boolean not null default false;

comment on column public.quiz_sessions.question_set_enforced is
  'True when the round has a server-side question set that every answer must be part of.';


-- --- Die Pruefung ------------------------------------------------------------
-- Unveraendert bis auf den einen Block in der Mitte.

create or replace function public.score_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correct public.answer_key;
  v_difficulty public.difficulty_level;
  v_session public.quiz_sessions%rowtype;
  v_already_correct boolean;
  v_is_daily boolean;
  v_xp integer;
  v_server_date date := (now() at time zone 'utc')::date;
begin
  select * into v_session from public.quiz_sessions where id = new.quiz_session_id;
  if not found then
    raise exception 'quiz session not found' using errcode = 'foreign_key_violation';
  end if;
  if v_session.user_id <> new.user_id then
    raise exception 'attempt user does not match session user' using errcode = 'insufficient_privilege';
  end if;
  if v_session.completed_at is not null then
    raise exception 'quiz session is already completed' using errcode = 'check_violation';
  end if;

  -- Gehoert die Frage ueberhaupt zu dieser Runde? Beantwortbar erst, seit es
  -- ein Fragenset gibt – und nur fuer Runden, die eines haben.
  if v_session.question_set_enforced then
    if not exists (
      select 1 from public.quiz_session_questions sq
      where sq.quiz_session_id = new.quiz_session_id
        and sq.question_id = new.question_id
    ) then
      raise exception 'question does not belong to this round' using errcode = 'check_violation';
    end if;
  end if;

  select correct_answer, difficulty into v_correct, v_difficulty
  from public.questions
  where id = new.question_id and status = 'published';
  if not found then
    raise exception 'question is not available' using errcode = 'foreign_key_violation';
  end if;

  -- Local dates can legitimately differ from UTC by at most one day.
  if new.answered_on < v_server_date - 1 or new.answered_on > v_server_date + 1 then
    new.answered_on := v_server_date;
  end if;

  new.is_correct := (new.selected_answer = v_correct);
  v_is_daily := (v_session.session_type = 'daily');

  select exists (
    select 1 from public.quiz_attempts a
    where a.question_id = new.question_id and a.user_id = new.user_id and a.is_correct
  ) into v_already_correct;

  if not new.is_correct or (v_already_correct and not v_is_daily) or public.is_repeated_daily(v_session.id) then
    v_xp := 0;
  else
    v_xp := public.xp_for_answer(true, v_difficulty);
    if v_is_daily then
      v_xp := v_xp * 2;
    elsif v_session.session_type = 'duel' then
      v_xp := round(v_xp * 1.5);
    end if;
  end if;

  new.xp_earned := v_xp;
  return new;
end;
$$;


-- --- Die Fragen einer Runde nachschlagen -------------------------------------
--
-- Bisher las die Funktion sie aus den *Antworten*. Fuer eine abgebrochene Runde
-- kamen damit nur die beantworteten Fragen zurueck, und die Reihenfolge war die
-- der Antworten statt die der Runde. Neu ist das Fragenset die Quelle – mit
-- Rueckfallweg, denn fuer jede Runde von vor dieser Migration gibt es keines.

create or replace function public.get_my_session_questions(p_session_id uuid)
returns setof public.questions
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_signed_in_user();
begin
  if not exists (
    select 1 from public.quiz_sessions s where s.id = p_session_id and s.user_id = v_me
  ) then
    return;
  end if;

  if exists (select 1 from public.quiz_session_questions sq where sq.quiz_session_id = p_session_id) then
    return query
      select q.*
      from public.quiz_session_questions sq
      join public.questions q on q.id = sq.question_id
      where sq.quiz_session_id = p_session_id
      order by sq.sort_position;
  else
    return query
      select q.*
      from public.questions q
      join public.quiz_attempts a on a.question_id = q.id
      where a.quiz_session_id = p_session_id
        and a.user_id = v_me
      order by a.created_at;
  end if;
end;
$$;

revoke all on function public.get_my_session_questions(uuid) from public, anon;
grant execute on function public.get_my_session_questions(uuid) to authenticated;
