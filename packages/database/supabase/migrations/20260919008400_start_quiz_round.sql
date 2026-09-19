-- =============================================================================
-- QuizByte – auch die uebrigen Runden beginnen auf dem Server
--
-- Daily und Duell haben es seit 20260919008200; hier kommen Kategorie, Random,
-- Schwaechentraining und die Wiederholungen dazu. Die Aufteilung bleibt die
-- vereinbarte:
--
--   Der Client sagt, was er moechte – Kategorie, Modus, Schwierigkeiten,
--   "nur neue Fragen", bei Wiederholungen die Frage-Ids.
--   Der Server prueft den Wunsch, waehlt aus und haelt die Auswahl fest.
--
-- Die Auswahlregeln sind dieselben wie bisher im Client
-- (packages/shared/src/domain/quiz):
--
--   filterByDifficulty      – gewaehlte Stufen, und wenn keine Frage passt,
--                             gilt der Filter nicht; eine Vorliebe darf
--                             niemanden ohne Quiz zuruecklassen.
--   preferUnseenQuestions   – "nur neue Fragen" ist eine Reihenfolge, kein
--                             Filter: unbeantwortete zuerst, danach wird
--                             aufgefuellt. Sonst endete eine Blitzrunde, weil
--                             die Kategorie leer war statt weil die Zeit um war.
--   selectSessionQuestions  – beim Schwaechentraining etwa sieben von zehn
--                             Fragen aus den schwachen Themen, der Rest
--                             gemischt; am Ende zufaellige Reihenfolge.
--
-- Bei Wiederholungen (Fehler, Kategorie-Aufriss, Gespeichertes) schickt der
-- Client Ids. Angenommen wird eine Id nur, wenn die Frage veroeffentlicht ist,
-- ihre Kategorie aktiv – und wenn der Nutzer sie schon einmal beantwortet oder
-- gespeichert hat. Ohne diese letzte Bedingung waere "Wiederholung" der
-- bequeme Weg, zu einer beliebigen Frage-Id die Loesung anzufordern.
-- =============================================================================

create or replace function public.start_quiz_round(
  p_type public.session_type,
  p_mode public.quiz_mode default 'classic',
  p_count integer default 5,
  p_category_id uuid default null,
  p_difficulties public.difficulty_level[] default null,
  p_only_new boolean default false,
  p_subcategories text[] default '{}',
  p_tags text[] default '{}',
  p_category_ids uuid[] default '{}',
  p_question_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_count integer := greatest(1, least(coalesce(p_count, 5), 100));
  v_ids uuid[];
  v_session uuid;
  v_preferred integer;
begin
  if p_type not in ('category', 'random', 'weakness') then
    raise exception 'this round type has its own start function' using errcode = 'check_violation';
  end if;

  if p_question_ids is not null then
    -- Wiederholung: der Client nennt die Fragen, der Server prueft jede einzeln.
    -- Die Reihenfolge des Clients bleibt – sie ist die, in der er sie anzeigt.
    select array_agg(u.id order by u.pos)
      into v_ids
    from unnest(p_question_ids) with ordinality as u(id, pos)
    join public.questions q on q.id = u.id
    join public.categories c on c.id = q.category_id
    where q.status = 'published'
      and c.is_active = true
      and (q.requires_pro = false or public.user_has_pro())
      and (c.requires_pro = false or public.user_has_pro())
      and (
        exists (select 1 from public.quiz_attempts a where a.question_id = q.id and a.user_id = v_me)
        or exists (select 1 from public.saved_questions s where s.question_id = q.id and s.user_id = v_me)
      );

    if v_ids is not null and array_length(v_ids, 1) > v_count then
      v_ids := v_ids[1:v_count];
    end if;
  else
    v_preferred := case
      when p_type = 'weakness' then round(v_count * 0.7)
      else 0
    end;

    with candidates as (
      select
        q.id,
        q.difficulty,
        -- Beim Schwaechentraining: gehoert die Frage zu einem der schwachen Themen?
        (p_type = 'weakness' and (
          q.subcategory = any (coalesce(p_subcategories, '{}'::text[]))
          or q.tags && coalesce(p_tags, '{}'::text[])
          or q.category_id = any (coalesce(p_category_ids, '{}'::uuid[]))
        )) as is_preferred,
        not exists (
          select 1 from public.quiz_attempts a
          where a.question_id = q.id and a.user_id = v_me
        ) as is_unseen
      from public.questions q
      join public.categories c on c.id = q.category_id
      where q.status = 'published'
        and c.is_active = true
        and (q.requires_pro = false or public.user_has_pro())
        and (c.requires_pro = false or public.user_has_pro())
        and (p_category_id is null or q.category_id = p_category_id)
    ),
    -- Der Schwierigkeitsfilter, mit seinem Rueckfall: passt keine Frage, gilt
    -- er nicht.
    filtered as (
      select cd.*
      from candidates cd
      where p_difficulties is null
         or array_length(p_difficulties, 1) is null
         or cd.difficulty = any (p_difficulties)
         or not exists (select 1 from candidates c2 where c2.difficulty = any (p_difficulties))
    ),
    ranked as (
      select
        f.id,
        f.is_preferred,
        f.is_unseen,
        row_number() over (
          partition by f.is_preferred
          order by (case when p_only_new and f.is_unseen then 0 else 1 end), random()
        ) as rn
      from filtered f
    ),
    chosen as (
      select r.id
      from ranked r
      order by
        case
          -- Erst die bevorzugten, aber nur bis zum Anteil.
          when r.is_preferred and r.rn <= v_preferred then 0
          when not r.is_preferred then 1
          -- Ueberzaehlige bevorzugte fuellen auf, wenn sonst nichts da ist.
          else 2
        end,
        case when p_only_new and r.is_unseen then 0 else 1 end,
        random()
      limit v_count
    )
    -- Die Auswahl steht; die Reihenfolge im Quiz ist zufaellig.
    select array_agg(ch.id order by random()) into v_ids from chosen ch;
  end if;

  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'no questions available' using errcode = 'no_data_found';
  end if;

  insert into public.quiz_sessions (user_id, category_id, session_type, mode, total_questions, question_set_enforced)
  values (v_me, p_category_id, p_type, coalesce(p_mode, 'classic'), array_length(v_ids, 1), true)
  returning id into v_session;

  insert into public.quiz_session_questions (quiz_session_id, question_id, sort_position)
  select v_session, u.id, u.pos
  from unnest(v_ids) with ordinality as u(id, pos);

  return public.session_start_payload(v_session, false);
end;
$$;

comment on function public.start_quiz_round(
  public.session_type, public.quiz_mode, integer, uuid, public.difficulty_level[], boolean,
  text[], text[], uuid[], uuid[]
) is 'Starts a category, random, weakness or replay round: the server picks or checks the questions and fixes them as the round''s set.';

revoke all on function public.start_quiz_round(
  public.session_type, public.quiz_mode, integer, uuid, public.difficulty_level[], boolean,
  text[], text[], uuid[], uuid[]
) from public, anon;
grant execute on function public.start_quiz_round(
  public.session_type, public.quiz_mode, integer, uuid, public.difficulty_level[], boolean,
  text[], text[], uuid[], uuid[]
) to authenticated;


-- --- Schwierigkeit mitten in der Runde umstellen ------------------------------
--
-- Bisher tauschte der Client die noch offenen Fragen aus einem Vorrat aus, den
-- er beim Start mitgeladen hatte. Mit einem serverseitigen Fragenset geht das
-- nicht mehr – und soll es auch nicht: was zur Runde gehoert, entscheidet der
-- Server.
--
-- Beantwortete Fragen bleiben, wo sie sind. Ihre Antworten liegen bereits auf
-- dem Server; sie umzusortieren hiesse, dass das Ergebnisbild etwas anderes
-- erzaehlt als die Datenbank. Neu gezogen wird nur der Rest, und die Runde
-- behaelt ihre Laenge.

create or replace function public.retune_quiz_round(
  p_session_id uuid,
  p_difficulties public.difficulty_level[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_session public.quiz_sessions%rowtype;
  v_answered integer;
  v_open integer;
  v_new uuid[];
begin
  select * into v_session from public.quiz_sessions where id = p_session_id for update;
  if not found or v_session.user_id is distinct from v_me then
    raise exception 'quiz session not found' using errcode = 'no_data_found';
  end if;
  if v_session.completed_at is not null then
    raise exception 'round is already finished' using errcode = 'check_violation';
  end if;
  if not v_session.question_set_enforced then
    raise exception 'this round has no server-side question set' using errcode = 'check_violation';
  end if;
  -- Nur Runden, deren Fragen frei gezogen werden. Ein Duell, das Tagesquiz und
  -- eine Wiederholung sind gesetzt: dort waere ein Tausch keine Einstellung,
  -- sondern eine andere Runde.
  if v_session.session_type not in ('category', 'random') then
    raise exception 'this round type keeps its questions' using errcode = 'check_violation';
  end if;

  select count(*) into v_answered from public.quiz_attempts a where a.quiz_session_id = p_session_id;

  select count(*) into v_open
  from public.quiz_session_questions sq
  where sq.quiz_session_id = p_session_id and sq.sort_position > v_answered;

  if v_open <= 0 then
    return public.session_start_payload(p_session_id, false);
  end if;

  with candidates as (
    select q.id, q.difficulty
    from public.questions q
    join public.categories c on c.id = q.category_id
    where q.status = 'published'
      and c.is_active = true
      and (q.requires_pro = false or public.user_has_pro())
      and (c.requires_pro = false or public.user_has_pro())
      and (v_session.category_id is null or q.category_id = v_session.category_id)
      -- Was schon beantwortet wurde, bleibt an seinem Platz und darf nicht
      -- ein zweites Mal in dieselbe Runde.
      and not exists (
        select 1 from public.quiz_session_questions sq
        where sq.quiz_session_id = p_session_id
          and sq.question_id = q.id
          and sq.sort_position <= v_answered
      )
  ),
  filtered as (
    select cd.id
    from candidates cd
    where p_difficulties is null
       or array_length(p_difficulties, 1) is null
       or cd.difficulty = any (p_difficulties)
       or not exists (select 1 from candidates c2 where c2.difficulty = any (p_difficulties))
  )
  select array_agg(f.id order by random()) into v_new from (select id from filtered order by random() limit v_open) f;

  if v_new is null or array_length(v_new, 1) is null then
    -- Nichts passt: die Runde bleibt, wie sie ist. Eine Einstellung darf eine
    -- laufende Runde nicht leeren.
    return public.session_start_payload(p_session_id, false);
  end if;

  delete from public.quiz_session_questions
  where quiz_session_id = p_session_id and sort_position > v_answered;

  insert into public.quiz_session_questions (quiz_session_id, question_id, sort_position)
  select p_session_id, u.id, v_answered + u.pos
  from unnest(v_new) with ordinality as u(id, pos);

  -- Weniger Ersatz als offene Plaetze: die Runde wird kuerzer statt leerer.
  update public.quiz_sessions
  set total_questions = greatest(1, v_answered + array_length(v_new, 1))
  where id = p_session_id;

  return public.session_start_payload(p_session_id, false);
end;
$$;

comment on function public.retune_quiz_round(uuid, public.difficulty_level[]) is
  'Redraws the unanswered tail of a running round for new difficulties. Answered questions stay put.';

revoke all on function public.retune_quiz_round(uuid, public.difficulty_level[]) from public, anon;
grant execute on function public.retune_quiz_round(uuid, public.difficulty_level[]) to authenticated;
