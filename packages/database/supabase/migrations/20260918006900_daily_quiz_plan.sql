-- =============================================================================
-- QuizByte – das Tagesquiz laesst sich planen
--
-- Bisher waehlt `get_daily_questions()` die Fragen ueber einen Hash aus
-- Frage-Id und Datum. Das ist gut: es ist fuer alle gleich, stabil ueber den
-- Tag, und es braucht niemanden, der morgens etwas eintraegt.
--
-- Was fehlt, ist die Ausnahme. Zum Ausbildungsstart, vor einer Pruefung, zu
-- einem Thema – dafuer soll man einen Tag von Hand belegen koennen.
--
-- Deshalb kein Ersatz, sondern ein Vorrang: liegt fuer den Tag ein Plan, gilt
-- er; liegt keiner, bleibt alles wie bisher. Ein vergessener Eintrag kann das
-- Tagesquiz also nicht ausfallen lassen.
-- =============================================================================

create table if not exists public.daily_quiz_plan (
  day date primary key,
  -- Reihenfolge zaehlt: sie ist die Reihenfolge im Quiz.
  question_ids uuid[] not null,
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_quiz_plan_not_empty check (array_length(question_ids, 1) between 1 and 50)
);

comment on table public.daily_quiz_plan is
  'Hand-picked questions for one day. Without a row the hash-based default applies.';

alter table public.daily_quiz_plan enable row level security;

-- Lesen darf jeder Angemeldete: `get_daily_questions` laeuft als Aufrufer und
-- muss den Plan sehen koennen. Was drinsteht, ist ohnehin das, was die App
-- gleich darauf anzeigt.
drop policy if exists "daily plan readable" on public.daily_quiz_plan;
create policy "daily plan readable"
  on public.daily_quiz_plan for select
  to authenticated
  using (true);

-- Geschrieben wird nur ueber die Funktion unten.
drop policy if exists "daily plan admin write" on public.daily_quiz_plan;


/**
 * Die Fragen des Tages – geplant, sonst gewuerfelt.
 *
 * Wie bisher `security invoker`: RLS auf `questions` und `categories` greift
 * genau wie sonst, und eine geplante Frage, die inzwischen zurueckgezogen oder
 * deren Kategorie abgeschaltet wurde, faellt aus dem Plan heraus statt in der
 * App aufzutauchen.
 *
 * Genau deshalb der Nachschlag am Ende: bleiben von zehn geplanten Fragen nur
 * acht uebrig, fuellt der Hash-Weg auf. Ein Tagesquiz mit zwei Fragen waere
 * schlechter als eines, das teils geplant ist.
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
  -- Der Plan des Tages, mit der Position jeder Frage darin.
  plan as (
    select ord.question_id, ord.pos
    from public.daily_quiz_plan p, unnest(p.question_ids) with ordinality as ord(question_id, pos)
    where p.day = public.daily_quiz_day()
  ),
  -- Was ueberhaupt in Frage kommt – dieselbe Bedingung wie vorher.
  eligible as (
    select q.id
    from public.questions q
    join public.categories c on c.id = q.category_id
    where q.status = 'published'
      and c.is_active = true
      and (q.requires_pro = false or public.user_has_pro())
      and (c.requires_pro = false or public.user_has_pro())
  ),
  /*
    Ein Sortierschluessel fuer beide Wege: geplante Fragen beginnen mit 'A' und
    ihrer Position, alle uebrigen mit 'B' und dem bisherigen Tages-Hash. Damit
    steht der Plan vorn, der Rest fuellt auf, und ohne Plan ist die Reihenfolge
    exakt die von vorher.
  */
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

comment on function public.get_daily_questions(integer) is
  'Today''s questions: the plan for the day if there is one, topped up from the daily hash.';

grant execute on function public.get_daily_questions(integer) to authenticated;


/** Legt den Plan fuer einen Tag an oder ersetzt ihn. Leere Liste = kein Plan. */
create or replace function public.admin_set_daily_plan(
  p_day date,
  p_question_ids uuid[],
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valid integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  if p_day is null then
    raise exception 'day missing' using errcode = 'invalid_parameter_value';
  end if;

  if p_question_ids is null or array_length(p_question_ids, 1) is null then
    delete from public.daily_quiz_plan where day = p_day;
    perform public.log_admin_action('plan_daily_quiz', to_char(p_day, 'YYYY-MM-DD') || ' → Standard');
    return;
  end if;

  -- Nur veroeffentlichte Fragen: ein Plan aus Entwuerfen faellt in der App
  -- still wieder heraus, und das merkt man erst am naechsten Morgen.
  select count(*) into v_valid
  from public.questions q
  where q.id = any(p_question_ids) and q.status = 'published';

  if v_valid <> array_length(p_question_ids, 1) then
    raise exception 'Nur veröffentlichte Fragen können geplant werden.' using errcode = 'check_violation';
  end if;

  insert into public.daily_quiz_plan (day, question_ids, note, created_by)
  values (p_day, p_question_ids, coalesce(p_note, ''), auth.uid())
  on conflict (day) do update
    set question_ids = excluded.question_ids,
        note = excluded.note,
        updated_at = now();

  perform public.log_admin_action(
    'plan_daily_quiz',
    to_char(p_day, 'YYYY-MM-DD') || ' → ' || array_length(p_question_ids, 1)::text || ' Fragen'
  );
end;
$$;

grant execute on function public.admin_set_daily_plan(date, uuid[], text) to authenticated;


/**
 * Die Tagesquiz-Uebersicht: was geplant ist und wie der Tag gelaufen ist.
 *
 * Rueckwaerts wie vorwaerts – vergangene Tage haben Zahlen, kuenftige einen
 * Plan, und beides steht in derselben Liste, weil man beim Planen wissen will,
 * wie die letzten Tage angenommen wurden.
 */
create or replace function public.admin_daily_overview(p_back integer default 7, p_forward integer default 7)
returns table (
  day date,
  planned_count integer,
  note text,
  players integer,
  sessions integer,
  avg_accuracy integer,
  perfect_rounds integer
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
  with days as (
    select generate_series(
      public.daily_quiz_day() - greatest(0, least(coalesce(p_back, 7), 60)),
      public.daily_quiz_day() + greatest(0, least(coalesce(p_forward, 7), 60)),
      interval '1 day'
    )::date as day
  ),
  runs as (
    select
      (s.completed_at at time zone 'Europe/Berlin')::date as day,
      count(*)::integer as sessions,
      count(distinct s.user_id)::integer as players,
      coalesce(round(100.0 * sum(s.correct_answers) / nullif(sum(s.total_questions), 0))::integer, 0) as avg_accuracy,
      count(*) filter (where s.total_questions > 0 and s.correct_answers = s.total_questions)::integer as perfect_rounds
    from public.quiz_sessions s
    where s.session_type = 'daily' and s.completed_at is not null
    group by 1
  )
  select
    d.day,
    coalesce(array_length(p.question_ids, 1), 0)::integer,
    coalesce(p.note, ''),
    coalesce(r.players, 0),
    coalesce(r.sessions, 0),
    coalesce(r.avg_accuracy, 0),
    coalesce(r.perfect_rounds, 0)
  from days d
  left join public.daily_quiz_plan p on p.day = d.day
  left join runs r on r.day = d.day
  order by d.day desc;
end;
$$;

grant execute on function public.admin_daily_overview(integer, integer) to authenticated;


/** Der Plan eines Tages, mit den Fragetexten dazu. */
create or replace function public.admin_daily_plan(p_day date)
returns table (
  -- Nicht 'position': das ist in SQL ein Schluesselwortname fuer eine
  -- Funktion und als Parametername unnoetig riskant.
  sort_position integer,
  question_id uuid,
  question_text text,
  category_name text,
  difficulty public.difficulty_level,
  status public.question_status
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

  -- Das Auspacken des Arrays in einem eigenen CTE: ein Komma-FROM und ein
  -- JOIN in derselben Klausel liest sich nur halb so klar, wie es rechnet.
  return query
  with plan as (
    select ord.question_id, ord.pos
    from public.daily_quiz_plan p, unnest(p.question_ids) with ordinality as ord(question_id, pos)
    where p.day = p_day
  )
  select
    pl.pos::integer,
    q.id,
    q.question_text,
    c.name,
    q.difficulty,
    q.status
  from plan pl
  join public.questions q on q.id = pl.question_id
  join public.categories c on c.id = q.category_id
  order by pl.pos;
end;
$$;

grant execute on function public.admin_daily_plan(date) to authenticated;
