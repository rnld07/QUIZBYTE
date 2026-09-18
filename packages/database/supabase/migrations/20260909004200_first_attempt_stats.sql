-- =============================================================================
-- QuizByte – Statistiken zaehlen nur den ersten Versuch
--
-- Bisher zaehlte jede Antwort. Wer eine Frage zweimal bekam, tauchte damit
-- zweimal in der Statistik auf, und die Trefferquote verschob sich mit jeder
-- Wiederholung – nach oben, weil man eine Frage beim zweiten Mal meistens
-- richtig hat. Das misst dann das Wiederholen, nicht das Wissen.
--
-- Ab jetzt zaehlt pro Frage der **erste** Versuch. Damit ist "beantwortet" die
-- Anzahl der Fragen, die man kennt, und die Quote sagt, wie viele davon man
-- gleich beim ersten Mal konnte.
--
-- Unberuehrt bleiben: XP und Streak (die haengen an jeder einzelnen Antwort),
-- `user_progress` als Rohzaehler, und die offenen Fehler unter "Schwaechen
-- trainieren" – dort geht es gerade darum, dass ein zweiter Versuch zaehlt.
-- =============================================================================

/**
 * Der jeweils erste Versuch je Frage fuer den angemeldeten Nutzer.
 *
 * Die Basis aller Statistikfunktionen unten. `created_at` entscheidet, `id` ist
 * nur der Gleichstandsloeser, damit das Ergebnis stabil ist.
 */
create or replace function public.my_first_attempts()
returns table (question_id uuid, is_correct boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (a.question_id) a.question_id, a.is_correct
  from public.quiz_attempts a
  where a.user_id = auth.uid()
  order by a.question_id, a.created_at, a.id;
$$;

comment on function public.my_first_attempts() is 'First attempt per question for the current user – the basis of every progress statistic.';

grant execute on function public.my_first_attempts() to authenticated;

/** Beantwortete Fragen und Treffer insgesamt – die Kopfzahlen im Fortschritt. */
create or replace function public.get_my_answer_stats()
returns table (answered bigint, correct bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*), count(*) filter (where f.is_correct)
  from public.my_first_attempts() f;
$$;

grant execute on function public.get_my_answer_stats() to authenticated;

-- Die bestehenden Aufschluesselungen, jetzt auf derselben Basis ------------------------

create or replace function public.get_my_category_stats()
returns table (
  category_id uuid,
  category_slug text,
  category_name text,
  attempts bigint,
  correct bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.slug,
    c.name,
    count(f.question_id) as attempts,
    count(f.question_id) filter (where f.is_correct) as correct
  from public.my_first_attempts() f
  join public.questions q on q.id = f.question_id
  join public.categories c on c.id = q.category_id
  group by c.id, c.slug, c.name
  order by c.sort_order, c.name;
$$;

grant execute on function public.get_my_category_stats() to authenticated;

create or replace function public.get_my_topic_stats()
returns table (
  kind text,
  key text,
  label text,
  attempts bigint,
  correct bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'category'::text as kind, c.id::text as key, c.name as label,
         count(*) as attempts, count(*) filter (where f.is_correct) as correct
  from public.my_first_attempts() f
  join public.questions q on q.id = f.question_id
  join public.categories c on c.id = q.category_id
  group by c.id, c.name

  union all

  select 'subcategory'::text, q.subcategory, q.subcategory,
         count(*), count(*) filter (where f.is_correct)
  from public.my_first_attempts() f
  join public.questions q on q.id = f.question_id
  where q.subcategory is not null
  group by q.subcategory

  union all

  select 'tag'::text, t.tag, t.tag,
         count(*), count(*) filter (where f.is_correct)
  from public.my_first_attempts() f
  join public.questions q on q.id = f.question_id
  cross join lateral unnest(q.tags) as t(tag)
  group by t.tag;
$$;

grant execute on function public.get_my_topic_stats() to authenticated;

create or replace function public.get_my_difficulty_stats()
returns table (
  difficulty public.difficulty_level,
  attempts bigint,
  correct bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.difficulty,
    count(*) as attempts,
    count(*) filter (where f.is_correct) as correct
  from public.my_first_attempts() f
  join public.questions q on q.id = f.question_id
  group by q.difficulty;
$$;

grant execute on function public.get_my_difficulty_stats() to authenticated;

create or replace function public.get_my_category_difficulty_stats(p_category_id uuid)
returns table (
  difficulty public.difficulty_level,
  attempts bigint,
  correct bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    q.difficulty,
    count(*) as attempts,
    count(*) filter (where f.is_correct) as correct
  from public.my_first_attempts() f
  join public.questions q on q.id = f.question_id
  where q.category_id = p_category_id
  group by q.difficulty;
$$;

grant execute on function public.get_my_category_difficulty_stats(uuid) to authenticated;
