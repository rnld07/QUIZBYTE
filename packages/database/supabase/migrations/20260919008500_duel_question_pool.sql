-- =============================================================================
-- QuizByte – ein eigener Fragenbestand fuers Duell
--
-- Die Duellfragen ohne Loesung auszuliefern ist richtig, reicht aber nicht,
-- solange sie aus demselben Bestand stammen wie die Solo-Fragen. Der Grund ist
-- der Offlinebetrieb: eine Solo-Runde wird auf dem Geraet ausgewertet, also
-- muss ihre Loesung vorher dort liegen. Wer genug Solo-Runden spielt, kennt
-- damit irgendwann den halben Bestand – und die Maskierung im Duell haelt
-- niemanden mehr auf.
--
-- Diese Migration macht daraus zwei Bestaende. Eine Frage mit `duel_pool` kommt
-- ausschliesslich im Duell vor:
--
--   * `create_duel` zieht nur noch aus ihnen.
--   * Kein Solo-Weg liefert sie aus – nicht das Tagesquiz, nicht Kategorie,
--     Zufall, Schwaechentraining, Gespeichertes, nicht die Wiederholung ueber
--     Ids, und im Chat sind sie nicht teilbar.
--
-- Damit verlaesst die Loesung einer Duellfrage den Server nur noch als
-- *Ergebnis* einer Abgabe. Ein veraenderter Client gewinnt dadurch nichts mehr.
--
-- Die Bedingung dafuer liegt nicht im Code: es muessen genug Fragen markiert
-- sein. `duel_question_count` verlangt bis zu 40 Fragen fuer Survival, und ein
-- Bestand, der kaum groesser ist als eine Runde, zeigt in jedem Duell
-- dieselben Fragen. Deshalb faellt `create_duel` auf den Gesamtbestand zurueck,
-- solange der Duellbestand zu klein ist – sonst waere das Duell ab dem
-- Einspielen kaputt. Was in den Bestand gehoert, entscheidet die Redaktion im
-- Adminbereich; der Schutz greift, sobald genug drin ist.
--
-- Historie bleibt Historie: `get_my_category_questions` und
-- `get_my_session_questions` zeigen weiterhin, was jemand gespielt hat, auch
-- wenn eine Frage spaeter in den Duellbestand gewandert ist.
-- =============================================================================

alter table public.questions
  add column if not exists duel_pool boolean not null default false;

comment on column public.questions.duel_pool is
  'Duel-only question: never handed to a solo round, so its solution never reaches a client unanswered.';

create index if not exists questions_duel_pool_idx on public.questions (duel_pool) where duel_pool;

/** Wie viele Fragen der Duellbestand hat. Unter dieser Zahl greift der Rueckfall. */
create or replace function public.duel_pool_minimum()
returns integer
language sql
immutable
set search_path = ''
as $$ select 40; $$;

comment on function public.duel_pool_minimum() is
  'Below this many duel-pool questions create_duel falls back to the whole catalogue.';

revoke all on function public.duel_pool_minimum() from public, anon;
grant execute on function public.duel_pool_minimum() to authenticated;

/** Groesse des Duellbestands – fuer den Adminbereich. */
create or replace function public.duel_pool_size()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.duel_pool
    and q.status = 'published'
    and c.is_active = true
    and q.requires_pro = false
    and c.requires_pro = false;
$$;

revoke all on function public.duel_pool_size() from public, anon;
grant execute on function public.duel_pool_size() to authenticated;


-- --- Das Duell zieht aus seinem Bestand --------------------------------------

create or replace function public.create_duel(p_friend_id uuid, p_mode public.quiz_mode default 'classic')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_questions uuid[];
  v_wanted integer := public.duel_question_count(p_mode);
  v_own_pool boolean := public.duel_pool_size() >= public.duel_pool_minimum();
  v_id uuid;
begin
  if not public.are_friends(p_friend_id, v_me) then
    raise exception 'not friends' using errcode = 'insufficient_privilege';
  end if;

  if public.open_duel_with(p_friend_id) is not null then
    raise exception 'duel already open' using errcode = 'unique_violation';
  end if;

  select array_agg(q.id) into v_questions
  from (
    select q.id
    from public.questions q
    join public.categories c on c.id = q.category_id
    where q.status = 'published'
      and c.is_active = true
      and q.requires_pro = false
      and c.requires_pro = false
      -- Solange der Duellbestand zu klein ist, zaehlt der ganze Katalog.
      and (not v_own_pool or q.duel_pool)
    order by random()
    limit v_wanted
  ) q;

  -- Fuer die offenen Modi reicht auch weniger als die Wunschzahl, solange beide
  -- dasselbe bekommen; nur ganz ohne Fragen geht es nicht.
  if v_questions is null or array_length(v_questions, 1) < least(v_wanted, 5) then
    raise exception 'not enough questions for a duel' using errcode = 'no_data_found';
  end if;

  insert into public.duels (challenger_id, opponent_id, question_ids, mode)
  values (v_me, p_friend_id, v_questions, p_mode)
  returning id into v_id;

  insert into public.friend_messages (sender_id, recipient_id, kind, duel_id)
  values (v_me, p_friend_id, 'duel', v_id);

  return v_id;
end;
$$;

revoke all on function public.create_duel(uuid, public.quiz_mode) from public, anon;
grant execute on function public.create_duel(uuid, public.quiz_mode) to authenticated;


-- --- Und kein Solo-Weg liefert sie aus ---------------------------------------

create or replace function public.get_session_questions(
  p_category_id uuid default null,
  p_limit integer default 10
)
returns setof public.questions
language sql
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and not q.duel_pool
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and (p_category_id is null or q.category_id = p_category_id)
  order by random()
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

revoke all on function public.get_session_questions(uuid, integer) from public, anon;
grant execute on function public.get_session_questions(uuid, integer) to authenticated;

create or replace function public.get_training_questions(
  p_subcategories text[] default '{}',
  p_tags text[] default '{}',
  p_category_ids uuid[] default '{}',
  p_limit integer default 30
)
returns setof public.questions
language sql
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and not q.duel_pool
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and (
      q.subcategory = any (coalesce(p_subcategories, '{}'))
      or q.tags && coalesce(p_tags, '{}')
      or q.category_id = any (coalesce(p_category_ids, '{}'))
    )
  order by random()
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

revoke all on function public.get_training_questions(text[], text[], uuid[], integer) from public, anon;
grant execute on function public.get_training_questions(text[], text[], uuid[], integer) to authenticated;

create or replace function public.get_my_saved_questions(p_limit integer default 50)
returns setof public.questions
language sql
stable
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.saved_questions s on s.question_id = q.id
  join public.categories c on c.id = q.category_id
  where s.user_id = auth.uid()
    and q.status = 'published'
    and c.is_active = true
    and not q.duel_pool
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
  order by s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.get_my_saved_questions(integer) from public, anon;
grant execute on function public.get_my_saved_questions(integer) to authenticated;

/**
 * Die Fragen des Tages – geplant, sonst gewuerfelt.
 *
 * Unveraendert bis auf `not q.duel_pool`: was im Duell gefragt wird, darf nicht
 * am selben Tag allen als Tagesquiz mit Loesung ausgeliefert werden.
 */
create or replace function public.get_daily_questions(p_limit integer default 5)
returns setof public.questions
language sql
stable
set search_path = ''
as $$
  with wanted as (
    select greatest(1, least(coalesce(p_limit, 5), 50)) as n
  ),
  plan as (
    select ord.question_id, ord.pos
    from public.daily_quiz_plan p, unnest(p.question_ids) with ordinality as ord(question_id, pos)
    where p.day = public.daily_quiz_day()
  ),
  eligible as (
    select q.id
    from public.questions q
    join public.categories c on c.id = q.category_id
    where q.status = 'published'
      and c.is_active = true
      and not q.duel_pool
      and (q.requires_pro = false or public.user_has_pro())
      and (c.requires_pro = false or public.user_has_pro())
  ),
  ranked as (
    select
      e.id,
      case
        when pl.pos is not null then 'A' || lpad(pl.pos::text, 6, '0')
        else 'B' || md5(e.id::text || public.daily_quiz_day()::text)
      end as sort_key
    from eligible e
    left join plan pl on pl.question_id = e.id
  ),
  chosen as (
    select r.id, r.sort_key from ranked r order by r.sort_key limit (select n from wanted)
  )
  select q.*
  from public.questions q
  join chosen ch on ch.id = q.id
  order by ch.sort_key;
$$;

revoke all on function public.get_daily_questions(integer) from public, anon;
grant execute on function public.get_daily_questions(integer) to authenticated;


-- --- Auch nicht ueber den Umweg ----------------------------------------------
--
-- Die Wiederholung nimmt Ids entgegen. Ohne diese Zeile waere sie der
-- verbliebene gezielte Weg: Duellfrage speichern, als Wiederholung anfordern,
-- Loesung lesen.

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
    select array_agg(u.id order by u.pos)
      into v_ids
    from unnest(p_question_ids) with ordinality as u(id, pos)
    join public.questions q on q.id = u.id
    join public.categories c on c.id = q.category_id
    where q.status = 'published'
      and c.is_active = true
      and not q.duel_pool
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
    -- Anteil der Schwaechenfragen: WEAKNESS_PREFERRED_SHARE in
    -- packages/shared/src/config/quiz.ts.
    v_preferred := case
      when p_type = 'weakness' then round(v_count * 0.7)
      else 0
    end;

    with candidates as (
      select
        q.id,
        q.difficulty,
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
        and not q.duel_pool
        and (q.requires_pro = false or public.user_has_pro())
        and (c.requires_pro = false or public.user_has_pro())
        and (p_category_id is null or q.category_id = p_category_id)
    ),
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
          when r.is_preferred and r.rn <= v_preferred then 0
          when not r.is_preferred then 1
          else 2
        end,
        case when p_only_new and r.is_unseen then 0 else 1 end,
        random()
      limit v_count
    )
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
      and not q.duel_pool
      and (q.requires_pro = false or public.user_has_pro())
      and (c.requires_pro = false or public.user_has_pro())
      and (v_session.category_id is null or q.category_id = v_session.category_id)
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
  select array_agg(f.id) into v_new from (select id from filtered order by random() limit v_open) f;

  if v_new is null or array_length(v_new, 1) is null then
    return public.session_start_payload(p_session_id, false);
  end if;

  delete from public.quiz_session_questions
  where quiz_session_id = p_session_id and sort_position > v_answered;

  insert into public.quiz_session_questions (quiz_session_id, question_id, sort_position)
  select p_session_id, u.id, v_answered + u.pos
  from unnest(v_new) with ordinality as u(id, pos);

  update public.quiz_sessions
  set total_questions = greatest(1, v_answered + array_length(v_new, 1))
  where id = p_session_id;

  return public.session_start_payload(p_session_id, false);
end;
$$;


-- --- Und nicht im Chat --------------------------------------------------------

create or replace function public.send_question_to_friend(p_friend_id uuid, p_question_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.require_active_user();
  v_id uuid;
begin
  if not public.are_friends(p_friend_id, v_me) then
    raise exception 'not friends' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.questions q
    where q.id = p_question_id and q.status = 'published' and not q.duel_pool
  ) then
    raise exception 'question is not available' using errcode = 'foreign_key_violation';
  end if;

  insert into public.friend_messages (sender_id, recipient_id, kind, question_id)
  values (v_me, p_friend_id, 'question', p_question_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.send_question_to_friend(uuid, uuid) from public, anon;
grant execute on function public.send_question_to_friend(uuid, uuid) to authenticated;


-- --- Und nicht in den Schwaechen ----------------------------------------------
--
-- Eine im Duell falsch beantwortete Frage waere sonst eine offene Schwaeche,
-- die in der Liste steht, sich aber nicht wiederholen laesst – die Wiederholung
-- weist Duellfragen ab. Lieber gar nicht auffuehren als etwas anbieten, das
-- nicht geht. Duellfragen bleiben damit unter sich, in beide Richtungen.

create or replace function public.count_my_wrong_questions()
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and not q.duel_pool
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and public.is_open_weakness(q.id)
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    );
$$;

revoke all on function public.count_my_wrong_questions() from public, anon;
grant execute on function public.count_my_wrong_questions() to authenticated;

create or replace function public.get_my_wrong_questions(p_limit integer default 30)
returns setof public.questions
language sql
stable
set search_path = ''
as $$
  select q.*
  from public.questions q
  join public.categories c on c.id = q.category_id
  where q.status = 'published'
    and c.is_active = true
    and not q.duel_pool
    and (q.requires_pro = false or public.user_has_pro())
    and (c.requires_pro = false or public.user_has_pro())
    and public.is_open_weakness(q.id)
    and not exists (
      select 1 from public.dismissed_weaknesses d
      where d.question_id = q.id and d.user_id = auth.uid()
    )
  -- Der juengste Fehler zuerst: das ist das, was gerade drueckt.
  order by (
    select max(a.created_at) from public.quiz_attempts a
    where a.question_id = q.id and a.user_id = auth.uid() and a.is_correct = false
  ) desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

revoke all on function public.get_my_wrong_questions(integer) from public, anon;
grant execute on function public.get_my_wrong_questions(integer) to authenticated;
