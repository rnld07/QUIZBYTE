-- =============================================================================
-- QuizByte – das Adminpanel bekommt Zahlen
--
-- Bisher las das Panel Tabellen direkt und zaehlte im Browser nach. Das geht,
-- solange es hundert Fragen sind. Alles hier drin ist der Gegenentwurf: jede
-- Kennzahl ist eine Abfrage, die in der Datenbank fertig gerechnet wird und
-- eine Zeile oder ein JSON-Objekt zurueckgibt.
--
-- Jede Funktion prueft `is_admin()` selbst. Das Panel prueft es auch, aber ein
-- RPC laesst sich ohne Panel aufrufen – und dann zaehlt nur, was hier steht.
-- =============================================================================

-- --- Notizen an Meldungen ----------------------------------------------------
-- Warum eine Meldung geschlossen wurde, stand bisher nirgends. Beim naechsten
-- Bericht ueber dieselbe Person ist genau das die Frage.

alter table public.user_reports
  add column if not exists admin_note text not null default '';

alter table public.question_reports
  add column if not exists admin_note text not null default '';

-- Wer die Meldung zuletzt angefasst hat und wann – fuer die Liste reicht das,
-- die Begruendung steht im Protokoll.
alter table public.user_reports
  add column if not exists reviewed_at timestamptz;

alter table public.question_reports
  add column if not exists reviewed_at timestamptz;


-- --- Ein Platz fuer das Protokoll -------------------------------------------

/**
 * Schreibt einen Eintrag ins Adminprotokoll.
 *
 * Als eigene Funktion, weil sie inzwischen von einem Dutzend Stellen aus
 * aufgerufen wird und der `insert` an jeder davon dieselben vier Zeilen waere.
 */
create or replace function public.log_admin_action(
  p_kind public.admin_action_kind,
  p_details text,
  p_target_user_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_actions (admin_id, target_user_id, kind, details)
  values (auth.uid(), p_target_user_id, p_kind, coalesce(p_details, ''));
$$;

revoke all on function public.log_admin_action(public.admin_action_kind, text, uuid) from public;


-- --- Kennzahlen fuers Dashboard ---------------------------------------------

/**
 * Alles, was oben auf dem Dashboard steht – in einer Abfrage.
 *
 * Als JSON statt als Zeile: die Kennzahlen aendern sich haeufiger als das
 * Panel, und ein neuer Wert soll keine Signaturaenderung mit Drop und Neuanlage
 * nach sich ziehen.
 *
 * "Aktiv" heisst: hat an dem Tag eine Frage beantwortet. Anmelden allein ist
 * keine Nutzung, und die App haelt die Sitzung monatelang offen.
 */
create or replace function public.admin_dashboard_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := public.daily_quiz_day();
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'active_today', (
      select count(distinct a.user_id) from public.quiz_attempts a where a.answered_on = v_today
    ),
    'active_7d', (
      select count(distinct a.user_id) from public.quiz_attempts a where a.answered_on > v_today - 7
    ),
    'active_yesterday', (
      select count(distinct a.user_id) from public.quiz_attempts a where a.answered_on = v_today - 1
    ),
    'new_users_today', (
      select count(*) from public.profiles p
      where (p.created_at at time zone 'Europe/Berlin')::date = v_today
    ),
    'new_users_7d', (
      select count(*) from public.profiles p
      where (p.created_at at time zone 'Europe/Berlin')::date > v_today - 7
    ),
    'sessions_today', (
      select count(*) from public.quiz_sessions s
      where (s.started_at at time zone 'Europe/Berlin')::date = v_today
    ),
    'sessions_completed_today', (
      select count(*) from public.quiz_sessions s
      where s.completed_at is not null
        and (s.completed_at at time zone 'Europe/Berlin')::date = v_today
    ),
    'sessions_completed_total', (
      select count(*) from public.quiz_sessions s where s.completed_at is not null
    ),
    'sessions_total', (select count(*) from public.quiz_sessions),
    -- Ueber alle Antworten, nicht der Mittelwert der Nutzerquoten: wer drei
    -- Fragen beantwortet hat, soll die Quote nicht so stark bewegen wie wer
    -- dreihundert hat.
    'avg_accuracy', coalesce((
      select round(100.0 * sum(up.total_correct_answers) / nullif(sum(up.total_questions_answered), 0))
      from public.user_progress up
    ), 0),
    'open_user_reports', (select count(*) from public.user_reports r where r.status = 'open'),
    'open_question_reports', (select count(*) from public.question_reports r where r.status = 'open'),
    'suspended_users', (select count(*) from public.profiles p where p.suspended_at is not null),
    'users_total', (select count(*) from public.profiles),
    'questions_total', (select count(*) from public.questions),
    'questions_published', (select count(*) from public.questions q where q.status = 'published'),
    'questions_review', (select count(*) from public.questions q where q.status = 'review'),
    'questions_draft', (select count(*) from public.questions q where q.status = 'draft'),
    'questions_missing_image', (select count(*) from public.questions q where q.image_url is null),
    'questions_missing_audio', (select count(*) from public.questions q where q.audio_url is null),
    'categories_total', (select count(*) from public.categories),
    'categories_active', (select count(*) from public.categories c where c.is_active)
  ) into v_result;

  return v_result;
end;
$$;

comment on function public.admin_dashboard_kpis() is
  'Every headline figure of the admin dashboard, in one query.';

grant execute on function public.admin_dashboard_kpis() to authenticated;


/**
 * Die Aktivitaet der letzten Tage, eine Zeile je Tag.
 *
 * Tage ohne alles kommen als Nullen zurueck statt zu fehlen – eine Luecke in
 * der Reihe waere im Diagramm ein Sprung, und "nichts passiert" ist selbst
 * eine Auskunft.
 */
create or replace function public.admin_activity_history(p_days integer default 30)
returns table (
  day date,
  sessions integer,
  answers integer,
  active_users integer,
  new_users integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  return query
  with days as (
    select generate_series(
      public.daily_quiz_day() - (v_days - 1),
      public.daily_quiz_day(),
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    (
      select count(*)::integer from public.quiz_sessions s
      where (s.started_at at time zone 'Europe/Berlin')::date = d.day
    ),
    (select count(*)::integer from public.quiz_attempts a where a.answered_on = d.day),
    (select count(distinct a.user_id)::integer from public.quiz_attempts a where a.answered_on = d.day),
    (
      select count(*)::integer from public.profiles p
      where (p.created_at at time zone 'Europe/Berlin')::date = d.day
    )
  from days d
  order by d.day;
end;
$$;

grant execute on function public.admin_activity_history(integer) to authenticated;


/** Die meistgespielten Kategorien im Zeitraum, mit ihrer Trefferquote. */
create or replace function public.admin_top_categories(p_days integer default 30, p_limit integer default 8)
returns table (
  category_id uuid,
  name text,
  slug text,
  attempts integer,
  correct integer,
  accuracy integer,
  players integer
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
  select
    c.id,
    c.name,
    c.slug,
    count(*)::integer,
    count(*) filter (where a.is_correct)::integer,
    round(100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0))::integer,
    count(distinct a.user_id)::integer
  from public.quiz_attempts a
  join public.questions q on q.id = a.question_id
  join public.categories c on c.id = q.category_id
  where a.answered_on > public.daily_quiz_day() - greatest(1, least(coalesce(p_days, 30), 365))
  group by c.id, c.name, c.slug
  order by count(*) desc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
end;
$$;

grant execute on function public.admin_top_categories(integer, integer) to authenticated;


/**
 * Die Fragen, an denen die meisten scheitern.
 *
 * Mit einer Mindestzahl an Antworten: eine Frage, die einmal beantwortet und
 * einmal falsch war, steht sonst dauerhaft auf Platz eins und sagt nichts.
 */
create or replace function public.admin_hardest_questions(p_min_attempts integer default 5, p_limit integer default 10)
returns table (
  question_id uuid,
  question_text text,
  category_name text,
  difficulty public.difficulty_level,
  attempts integer,
  correct integer,
  accuracy integer
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
  select
    q.id,
    q.question_text,
    c.name,
    q.difficulty,
    count(*)::integer,
    count(*) filter (where a.is_correct)::integer,
    round(100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0))::integer
  from public.quiz_attempts a
  join public.questions q on q.id = a.question_id
  join public.categories c on c.id = q.category_id
  group by q.id, q.question_text, c.name, q.difficulty
  having count(*) >= greatest(1, coalesce(p_min_attempts, 5))
  order by
    round(100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0)) asc,
    count(*) desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
end;
$$;

grant execute on function public.admin_hardest_questions(integer, integer) to authenticated;


/** Die zuletzt registrierten Konten. */
create or replace function public.admin_recent_users(p_limit integer default 8)
returns table (
  id uuid,
  username text,
  display_name text,
  created_at timestamptz,
  total_xp integer,
  level integer,
  suspended boolean
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
  select
    p.id,
    p.username,
    p.display_name,
    p.created_at,
    coalesce(up.total_xp, 0),
    public.level_for_xp(coalesce(up.total_xp, 0)),
    p.suspended_at is not null
  from public.profiles p
  left join public.user_progress up on up.user_id = p.id
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
end;
$$;

grant execute on function public.admin_recent_users(integer) to authenticated;


-- --- Nutzerverwaltung --------------------------------------------------------

/**
 * Die Nutzertabelle, seitenweise.
 *
 * Alles in einer Abfrage statt einer Liste plus einer Zaehlung je Zeile: bei
 * fuenfzig Zeilen waeren das sonst zweihundert Rundreisen. Die Gesamtzahl
 * faehrt als Fensterfunktion mit, damit die Blaetterung ohne zweite Abfrage
 * auskommt.
 *
 * `last_sign_in_at` steht in `auth.users` – erreichbar nur von hier, weil die
 * Funktion `security definer` ist.
 */
create or replace function public.admin_list_users(
  p_search text default null,
  p_status text default null,
  p_sort text default 'created_at',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  role public.user_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  total_xp integer,
  level integer,
  current_streak integer,
  longest_streak integer,
  questions_answered integer,
  sessions_completed integer,
  accuracy integer,
  suspended_at timestamptz,
  suspended_reason text,
  report_count integer,
  total_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  return query
  with base as (
    select
      p.id,
      p.username,
      p.display_name,
      p.role,
      p.created_at,
      u.last_sign_in_at,
      coalesce(up.total_xp, 0) as total_xp,
      public.level_for_xp(coalesce(up.total_xp, 0)) as level,
      coalesce(up.current_streak, 0) as current_streak,
      coalesce(up.longest_streak, 0) as longest_streak,
      coalesce(up.total_questions_answered, 0) as questions_answered,
      coalesce(up.total_sessions_completed, 0) as sessions_completed,
      coalesce(
        round(100.0 * up.total_correct_answers / nullif(up.total_questions_answered, 0))::integer,
        0
      ) as accuracy,
      p.suspended_at,
      p.suspended_reason,
      (select count(*)::integer from public.user_reports r where r.reported_id = p.id) as report_count
    from public.profiles p
    left join public.user_progress up on up.user_id = p.id
    left join auth.users u on u.id = p.id
    where (v_search is null
        or p.username ilike '%' || v_search || '%'
        or coalesce(p.display_name, '') ilike '%' || v_search || '%')
      and (
        coalesce(p_status, 'all') = 'all'
        or (p_status = 'suspended' and p.suspended_at is not null)
        or (p_status = 'active' and p.suspended_at is null)
        or (p_status = 'reported' and exists (select 1 from public.user_reports r where r.reported_id = p.id))
        or (p_status = 'admin' and p.role = 'admin')
      )
  )
  select
    b.*,
    count(*) over ()::integer as total_count
  from base b
  order by
    case when coalesce(p_sort, 'created_at') = 'xp' then b.total_xp end desc nulls last,
    case when p_sort = 'streak' then b.current_streak end desc nulls last,
    case when p_sort = 'sessions' then b.sessions_completed end desc nulls last,
    case when p_sort = 'reports' then b.report_count end desc nulls last,
    case when p_sort = 'last_seen' then b.last_sign_in_at end desc nulls last,
    case when p_sort = 'username' then b.username end asc nulls last,
    b.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

comment on function public.admin_list_users(text, text, text, integer, integer) is
  'One page of the admin user table, filtered and sorted, with the total in every row.';

grant execute on function public.admin_list_users(text, text, text, integer, integer) to authenticated;


/** Ein Nutzer im Detail – alles, was die Profilseite im Panel zeigt. */
create or replace function public.admin_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'role', p.role,
    'is_anonymous', p.is_anonymous,
    'created_at', p.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'email', u.email,
    'suspended_at', p.suspended_at,
    'suspended_reason', p.suspended_reason,
    'searchable', p.searchable,
    'allow_friend_requests', p.allow_friend_requests,
    'username_changed_at', p.username_changed_at,
    'total_xp', coalesce(up.total_xp, 0),
    'level', public.level_for_xp(coalesce(up.total_xp, 0)),
    'current_streak', coalesce(up.current_streak, 0),
    'longest_streak', coalesce(up.longest_streak, 0),
    'questions_answered', coalesce(up.total_questions_answered, 0),
    'correct_answers', coalesce(up.total_correct_answers, 0),
    'sessions_completed', coalesce(up.total_sessions_completed, 0),
    'last_active_date', up.last_active_date,
    'friends', (
      select count(*) from public.friendships f
      where f.status = 'accepted' and (f.requester_id = p.id or f.addressee_id = p.id)
    ),
    'duels', (
      select count(*) from public.duels d
      where d.challenger_id = p.id or d.opponent_id = p.id
    ),
    'reports_against', (select count(*) from public.user_reports r where r.reported_id = p.id),
    'reports_filed', (select count(*) from public.user_reports r where r.reporter_id = p.id),
    'recent_sessions', coalesce((
      select jsonb_agg(row_to_json(s) order by s.started_at desc)
      from (
        select qs.id, qs.mode, qs.session_type, qs.started_at, qs.completed_at,
               qs.total_questions, qs.correct_answers, qs.xp_earned, c.name as category_name
        from public.quiz_sessions qs
        left join public.categories c on c.id = qs.category_id
        where qs.user_id = p.id
        order by qs.started_at desc
        limit 10
      ) s
    ), '[]'::jsonb)
  ) into v_result
  from public.profiles p
  left join public.user_progress up on up.user_id = p.id
  left join auth.users u on u.id = p.id
  where p.id = p_user_id;

  return v_result;
end;
$$;

grant execute on function public.admin_user_detail(uuid) to authenticated;


-- --- Moderation --------------------------------------------------------------

/**
 * Die Nutzermeldungen – wie bisher, jetzt mit Notiz und Pruefzeitpunkt.
 *
 * `create or replace` geht hier nicht: die Rueckgabe bekommt Spalten dazu.
 */
drop function if exists public.admin_list_user_reports(public.report_status);

create function public.admin_list_user_reports(p_status public.report_status default null)
returns table (
  id uuid,
  reason public.user_report_reason,
  details text,
  status public.report_status,
  admin_note text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reporter_id uuid,
  reporter_username text,
  reported_id uuid,
  reported_username text,
  reported_suspended_at timestamptz,
  reported_report_count integer
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
  select
    r.id,
    r.reason,
    r.details,
    r.status,
    r.admin_note,
    r.created_at,
    r.reviewed_at,
    r.reporter_id,
    reporter.username,
    r.reported_id,
    reported.username,
    reported.suspended_at,
    (select count(*)::integer from public.user_reports x where x.reported_id = r.reported_id)
  from public.user_reports r
  join public.profiles reporter on reporter.id = r.reporter_id
  join public.profiles reported on reported.id = r.reported_id
  where p_status is null or r.status = p_status
  order by (r.status = 'open') desc, r.created_at desc;
end;
$$;

grant execute on function public.admin_list_user_reports(public.report_status) to authenticated;


/** Die Fragemeldungen – bisher gab es dafuer im Panel gar keine Ansicht. */
create or replace function public.admin_list_question_reports(p_status public.report_status default null)
returns table (
  id uuid,
  reason public.report_reason,
  details text,
  status public.report_status,
  admin_note text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reporter_id uuid,
  reporter_username text,
  question_id uuid,
  question_text text,
  question_status public.question_status,
  category_name text,
  question_report_count integer
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
  select
    r.id,
    r.reason,
    r.details,
    r.status,
    r.admin_note,
    r.created_at,
    r.reviewed_at,
    r.user_id,
    reporter.username,
    r.question_id,
    q.question_text,
    q.status,
    c.name,
    (select count(*)::integer from public.question_reports x where x.question_id = r.question_id)
  from public.question_reports r
  join public.profiles reporter on reporter.id = r.user_id
  join public.questions q on q.id = r.question_id
  join public.categories c on c.id = q.category_id
  where p_status is null or r.status = p_status
  order by (r.status = 'open') desc, r.created_at desc;
end;
$$;

grant execute on function public.admin_list_question_reports(public.report_status) to authenticated;


/** Status und Notiz einer Nutzermeldung. */
create or replace function public.admin_set_report_status(
  p_report_id uuid,
  p_status public.report_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reported uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  update public.user_reports
  set status = p_status,
      admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note),
      reviewed_at = case when p_status = 'open' then null else now() end
  where id = p_report_id
  returning reported_id into v_reported;

  if v_reported is null then
    raise exception 'report not found' using errcode = 'no_data_found';
  end if;

  perform public.log_admin_action('resolve_report', 'Nutzermeldung → ' || p_status::text, v_reported);
end;
$$;

grant execute on function public.admin_set_report_status(uuid, public.report_status, text) to authenticated;


/** Dasselbe fuer eine Fragemeldung. */
create or replace function public.admin_set_question_report_status(
  p_report_id uuid,
  p_status public.report_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  update public.question_reports
  set status = p_status,
      admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note),
      reviewed_at = case when p_status = 'open' then null else now() end
  where id = p_report_id
  returning question_id into v_question;

  if v_question is null then
    raise exception 'report not found' using errcode = 'no_data_found';
  end if;

  perform public.log_admin_action(
    'resolve_question_report',
    'Fragemeldung → ' || p_status::text || ' (' || v_question::text || ')'
  );
end;
$$;

grant execute on function public.admin_set_question_report_status(uuid, public.report_status, text) to authenticated;


-- --- Fragen mit Zahlen -------------------------------------------------------

/**
 * Die Antwortstatistik je Frage – fuer genau die Fragen einer Tabellenseite.
 *
 * Bewusst mit einer Id-Liste statt "alle": die Tabelle zeigt fuenfundzwanzig
 * Zeilen, und eine Aggregation ueber saemtliche Antworten waere fuer jede
 * Seite dieselbe Arbeit.
 */
create or replace function public.admin_question_stats(p_ids uuid[])
returns table (
  question_id uuid,
  attempts integer,
  correct integer,
  accuracy integer,
  open_reports integer,
  total_reports integer
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
  select
    q.id,
    coalesce(a.attempts, 0)::integer,
    coalesce(a.correct, 0)::integer,
    coalesce(round(100.0 * a.correct / nullif(a.attempts, 0))::integer, 0),
    coalesce(r.open_reports, 0)::integer,
    coalesce(r.total_reports, 0)::integer
  from unnest(coalesce(p_ids, array[]::uuid[])) as q(id)
  left join (
    select x.question_id, count(*) as attempts, count(*) filter (where x.is_correct) as correct
    from public.quiz_attempts x
    where x.question_id = any(coalesce(p_ids, array[]::uuid[]))
    group by x.question_id
  ) a on a.question_id = q.id
  left join (
    select x.question_id,
           count(*) filter (where x.status = 'open') as open_reports,
           count(*) as total_reports
    from public.question_reports x
    where x.question_id = any(coalesce(p_ids, array[]::uuid[]))
    group by x.question_id
  ) r on r.question_id = q.id;
end;
$$;

grant execute on function public.admin_question_stats(uuid[]) to authenticated;


/**
 * Die Ids der Fragen, die einen Filter erfuellen, der sich nicht in der
 * Fragetabelle ausdruecken laesst.
 *
 * "Hohe Fehlerquote" und "gemeldet" haengen an anderen Tabellen. Die Liste
 * kommt hierher und geht als `in`-Filter zurueck in die normale Abfrage –
 * damit bleiben Blaetterung und alle uebrigen Filter, wie sie sind.
 */
create or replace function public.admin_question_ids_by_signal(
  p_signal text,
  p_max_accuracy integer default 45,
  p_min_attempts integer default 5
)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  if p_signal = 'reported' then
    return query
      select distinct r.question_id from public.question_reports r where r.status = 'open';
  elsif p_signal = 'hard' then
    return query
      select a.question_id
      from public.quiz_attempts a
      group by a.question_id
      having count(*) >= greatest(1, coalesce(p_min_attempts, 5))
         and round(100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0))
             <= greatest(0, least(coalesce(p_max_accuracy, 45), 100));
  else
    return;
  end if;
end;
$$;

grant execute on function public.admin_question_ids_by_signal(text, integer, integer) to authenticated;


-- --- Kategorien mit Zahlen ---------------------------------------------------

/** Je Kategorie: wie viele Fragen es gibt und wie gut sie beantwortet werden. */
create or replace function public.admin_category_stats()
returns table (
  category_id uuid,
  questions_total integer,
  questions_published integer,
  questions_missing_image integer,
  questions_missing_audio integer,
  attempts integer,
  accuracy integer,
  players integer
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
  select
    c.id,
    (select count(*)::integer from public.questions q where q.category_id = c.id),
    (select count(*)::integer from public.questions q where q.category_id = c.id and q.status = 'published'),
    (select count(*)::integer from public.questions q where q.category_id = c.id and q.image_url is null),
    (select count(*)::integer from public.questions q where q.category_id = c.id and q.audio_url is null),
    coalesce(s.attempts, 0)::integer,
    coalesce(round(100.0 * s.correct / nullif(s.attempts, 0))::integer, 0),
    coalesce(s.players, 0)::integer
  from public.categories c
  left join (
    select q.category_id,
           count(*) as attempts,
           count(*) filter (where a.is_correct) as correct,
           count(distinct a.user_id) as players
    from public.quiz_attempts a
    join public.questions q on q.id = a.question_id
    group by q.category_id
  ) s on s.category_id = c.id;
end;
$$;

grant execute on function public.admin_category_stats() to authenticated;


/**
 * Verschiebt eine Kategorie in der Reihenfolge um einen Platz.
 *
 * Als Tausch der beiden `sort_order`, nicht als freie Eingabe einer Zahl: die
 * Reihenfolge ist das, was man sieht, und wer sie von Hand nummeriert, hat
 * frueher oder spaeter zwei Kategorien auf derselben Position.
 */
create or replace function public.admin_move_category(p_category_id uuid, p_direction text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order integer;
  v_other_id uuid;
  v_other_order integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  select sort_order into v_order from public.categories where id = p_category_id;
  if v_order is null then
    raise exception 'category not found' using errcode = 'no_data_found';
  end if;

  if p_direction = 'up' then
    select id, sort_order into v_other_id, v_other_order
    from public.categories
    where (sort_order, name) < (v_order, (select name from public.categories where id = p_category_id))
    order by sort_order desc, name desc
    limit 1;
  else
    select id, sort_order into v_other_id, v_other_order
    from public.categories
    where (sort_order, name) > (v_order, (select name from public.categories where id = p_category_id))
    order by sort_order asc, name asc
    limit 1;
  end if;

  -- Am Rand angekommen: nichts zu tun, und das ist kein Fehler.
  if v_other_id is null then
    return;
  end if;

  -- Gleiche Nummer auf beiden Seiten: dann entscheidet bisher der Name. Einmal
  -- durchnummerieren macht die Reihenfolge wieder bewegbar.
  if v_other_order = v_order then
    with ordered as (
      select id, row_number() over (order by sort_order, name) * 10 as pos
      from public.categories
    )
    update public.categories c
    set sort_order = o.pos
    from ordered o
    where o.id = c.id;

    select sort_order into v_order from public.categories where id = p_category_id;
    select sort_order into v_other_order from public.categories where id = v_other_id;
  end if;

  update public.categories set sort_order = v_other_order where id = p_category_id;
  update public.categories set sort_order = v_order where id = v_other_id;

  perform public.log_admin_action('edit_category', 'Reihenfolge verschoben (' || p_direction || ')');
end;
$$;

grant execute on function public.admin_move_category(uuid, text) to authenticated;


-- --- Protokoll ---------------------------------------------------------------

/** Das Adminprotokoll mit dem Namen des Admins statt seiner Id. */
create or replace function public.admin_list_actions(p_limit integer default 50)
returns table (
  id uuid,
  kind public.admin_action_kind,
  details text,
  created_at timestamptz,
  admin_username text,
  target_user_id uuid,
  target_username text
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
  select
    a.id,
    a.kind,
    a.details,
    a.created_at,
    admin.username,
    a.target_user_id,
    target.username
  from public.admin_actions a
  left join public.profiles admin on admin.id = a.admin_id
  left join public.profiles target on target.id = a.target_user_id
  order by a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

grant execute on function public.admin_list_actions(integer) to authenticated;


-- --- Systemzustand -----------------------------------------------------------

/**
 * Was offensichtlich nicht stimmt.
 *
 * Keine Vollpruefung der Datenbank, sondern die Handvoll Faelle, die im Betrieb
 * tatsaechlich auftreten und die man sonst erst bemerkt, wenn sich jemand
 * beschwert.
 */
create or replace function public.admin_health_check()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    -- Ueber to_regclass abgefragt: die Migrationstabelle gehoert Supabase,
    -- nicht uns, und eine Datenbank ohne sie (ein blanker Testabzug) soll die
    -- Systemseite nicht mit einem Fehler beantworten.
    'last_migration', (
      case when to_regclass('supabase_migrations.schema_migrations') is null then null else (
        select jsonb_build_object('version', m.version, 'name', m.name)
        from supabase_migrations.schema_migrations m
        order by m.version desc
        limit 1
      ) end
    ),
    'migration_count', (
      case when to_regclass('supabase_migrations.schema_migrations') is null then 0 else (
        select count(*) from supabase_migrations.schema_migrations
      ) end
    ),
    'questions_missing_image', (select count(*) from public.questions q where q.image_url is null and q.status = 'published'),
    'questions_missing_audio', (select count(*) from public.questions q where q.audio_url is null and q.status = 'published'),
    -- Eine Kategorie ohne veroeffentlichte Frage ist in der App ein leeres Feld.
    'empty_active_categories', (
      select count(*) from public.categories c
      where c.is_active
        and not exists (select 1 from public.questions q where q.category_id = c.id and q.status = 'published')
    ),
    -- Runden, die vor mehr als einem Tag begonnen und nie geendet haben.
    'stale_sessions', (
      select count(*) from public.quiz_sessions s
      where s.completed_at is null and s.started_at < now() - interval '1 day'
    ),
    -- Duelle, deren Frist abgelaufen ist und die trotzdem noch offen stehen.
    'expired_open_duels', (
      select count(*) from public.duels d
      where d.status in ('pending', 'active')
        and now() > d.created_at + make_interval(days => public.duel_deadline_days())
    ),
    'profiles_without_progress', (
      select count(*) from public.profiles p
      where not exists (select 1 from public.user_progress up where up.user_id = p.id)
    ),
    'published_without_explanation', (
      select count(*) from public.questions q
      where q.status = 'published' and btrim(coalesce(q.explanation, '')) = ''
    ),
    'open_user_reports', (select count(*) from public.user_reports r where r.status = 'open'),
    'open_question_reports', (select count(*) from public.question_reports r where r.status = 'open')
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_health_check() to authenticated;
