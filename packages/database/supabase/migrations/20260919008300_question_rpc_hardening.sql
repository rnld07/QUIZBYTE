-- =============================================================================
-- QuizByte – zwei Lesewege, die ohne die Tabelle auskommen
--
-- Rein additiv: hier wird nichts entzogen und nichts umgestellt. Der Grund ist
-- die Reihenfolge. Spaeter faellt das direkte Leserecht auf
-- `questions.correct_answer` und `questions.explanation` weg – aber erst, wenn
-- genug Installationen die neue App haben. Damit die neue App das ueberlebt,
-- muss sie *vorher* Wege benutzen, die ohne den Tabellenzugriff auskommen.
-- Also kommen die Wege jetzt, und benutzt werden sie ab diesem Release.
--
-- Zwei Stellen lesen die Tabelle heute direkt:
--
--   questionsApi.fetchQuestionsByIds  – geteilte Fragen im Chat
--   admin/queries/questions.ts        – das Fragenformular
--
-- Dazu eine Ansicht fuer den Abschaltplan: sie zaehlt die Runden, die noch auf
-- dem alten Weg angelegt werden. Solange die Zahl nicht null ist, gibt es alte
-- Clients, und der Abschaltschritt wartet.
-- =============================================================================

-- --- Geteilte Fragen im Chat -------------------------------------------------
--
-- Dieselbe Regel wie ueberall: Loesung und Erklaerung gibt es nur zu Fragen, die
-- der Nutzer schon beantwortet hat – in einer Runde oder als geteilte Frage.
-- Vorher steht an ihrer Stelle NULL beziehungsweise ein leerer Text. Der
-- Rueckgabetyp bleibt `public.questions`, damit der Client dieselbe Abbildung
-- benutzt wie sonst auch.

create or replace function public.get_questions_for_chat(p_question_ids uuid[])
returns setof public.questions
language sql
stable
security definer
set search_path = ''
as $$
  select (
    case
      when exists (
        select 1 from public.quiz_attempts a
        where a.question_id = q.id and a.user_id = auth.uid()
      ) or exists (
        select 1
        from public.friend_messages m
        join public.shared_question_answers sa on sa.message_id = m.id
        where m.question_id = q.id and sa.user_id = auth.uid()
      )
      then q
      else jsonb_populate_record(
        null::public.questions,
        to_jsonb(q) || jsonb_build_object('correct_answer', null, 'explanation', '')
      )
    end
  ).*
  from public.questions q
  where q.id = any (coalesce(p_question_ids, '{}'::uuid[]))
    and q.status = 'published'
    and (q.requires_pro = false or public.user_has_pro())
    -- Nur Fragen, die tatsaechlich in einem meiner Chats stecken.
    and exists (
      select 1 from public.friend_messages m
      where m.question_id = q.id
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    );
$$;

comment on function public.get_questions_for_chat(uuid[]) is
  'Shared questions from the caller''s own chats. The solution only for questions they already answered.';

revoke all on function public.get_questions_for_chat(uuid[]) from public, anon;
grant execute on function public.get_questions_for_chat(uuid[]) to authenticated;


-- --- Eine Frage im Adminbereich ---------------------------------------------
-- Das Formular braucht die vollstaendige Zeile, Loesung und Erklaerung
-- eingeschlossen. Ueber eine eigene Funktion, weil der Tabellenweg dafuer
-- spaeter nicht mehr reicht.

create or replace function public.admin_question(p_id uuid)
returns setof public.questions
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  return query select q.* from public.questions q where q.id = p_id;
end;
$$;

comment on function public.admin_question(uuid) is 'One question in full, for the admin editor.';

revoke all on function public.admin_question(uuid) from public, anon;
grant execute on function public.admin_question(uuid) to authenticated;


-- --- Wie viele Runden noch auf dem alten Weg entstehen -----------------------
--
-- Eine Runde ohne serverseitiges Fragenset, die nach dieser Migration beginnt,
-- kommt zwangslaeufig aus einer App, die den neuen Weg noch nicht kennt. Das
-- ist das Kriterium fuer den Abschaltschritt: sieben Tage in Folge null.

create or replace function public.admin_legacy_session_starts(p_days integer default 30)
returns table (
  day date,
  session_type public.session_type,
  sessions bigint,
  users bigint
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
    select (s.started_at at time zone 'Europe/Berlin')::date as day,
           s.session_type,
           count(*) as sessions,
           count(distinct s.user_id) as users
    from public.quiz_sessions s
    where not s.question_set_enforced
      and s.started_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
    group by 1, 2
    order by 1 desc, 2;
end;
$$;

comment on function public.admin_legacy_session_starts(integer) is
  'Rounds still created the old way, per day. Zero for seven days in a row is the go-ahead for the lockdown step.';

revoke all on function public.admin_legacy_session_starts(integer) from public, anon;
grant execute on function public.admin_legacy_session_starts(integer) to authenticated;
