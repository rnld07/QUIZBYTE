-- =============================================================================
-- QuizByte – eine Daily-Frage zahlt genau einmal
--
-- Bisher haengt die Daily-Abrechnung an `is_repeated_daily(session)`: eine Runde
-- zahlt, wenn es an diesem Tag keine frueher *abgeschlossene* Daily-Runde gibt.
-- Das laesst sich umgehen, ohne etwas zu faelschen – man schliesst die Runde
-- einfach nie ab:
--
--   Runde starten, fuenf Fragen richtig, nicht abschliessen, neue Runde starten.
--   Die zweite Runde findet keine abgeschlossene vor sich und zahlt erneut.
--
-- Die Abrechnung haengt ab jetzt nicht mehr an der Runde, sondern an der Frage:
-- pro Nutzer, Tag und Frage gibt es genau eine Abrechnung, und es zaehlt der
-- **erste Versuch** – auch ein falscher. Wer eine Daily-Frage falsch
-- beantwortet, hat sie fuer diesen Tag verbraucht; sonst waere "absichtlich
-- falsch, Runde abbrechen, richtig" der naechste Weg, zweimal zu kassieren.
--
-- Die Sperre ist der Primaerschluessel selbst: zwei gleichzeitige Runden, die
-- dieselbe Frage abrechnen wollen, serialisiert PostgreSQL, und genau eine
-- bekommt `row_count = 1`. Kein Lesen-dann-Schreiben, kein Zeitfenster.
--
-- Der Tag kommt aus dem *Start der Runde*, nicht aus `now()`. Eine Antwort, die
-- aus der Offline-Warteschlange erst nach Mitternacht ankommt, gehoert zum Tag
-- ihrer Runde – sonst belegte sie einen Platz im neuen Tag mit einer Frage, die
-- dort gar nicht dran ist.
-- =============================================================================

create table public.daily_question_payouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_day date not null,
  question_id uuid not null references public.questions (id) on delete cascade,
  -- Was tatsaechlich gezahlt wurde. 0, wenn der erste Versuch falsch war.
  xp integer not null default 0,
  was_correct boolean not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quiz_day, question_id)
);

comment on table public.daily_question_payouts is
  'One row per user, quiz day and daily question: the first attempt, and what it paid.';

create index daily_question_payouts_day_idx on public.daily_question_payouts (quiz_day);

alter table public.daily_question_payouts enable row level security;

create policy "daily payouts: users read their own"
  on public.daily_question_payouts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "daily payouts: admins read all"
  on public.daily_question_payouts for select
  to authenticated
  using (public.is_admin());

-- Geschrieben wird nur vom Trigger, und der laeuft als Eigentuemer.
grant select on public.daily_question_payouts to authenticated;


-- --- Der Bestand kommt mit ---------------------------------------------------
--
-- Je Nutzer, Tag und Frage der zeitlich erste Versuch aus einer Daily-Runde –
-- nach derselben Regel, die ab jetzt gilt. Auch die falschen: sonst waere eine
-- Frage, die heute falsch beantwortet wurde, aus Sicht des Ledgers noch offen
-- und koennte am selben Tag doch noch zahlen.

insert into public.daily_question_payouts (user_id, quiz_day, question_id, xp, was_correct, claimed_at)
select distinct on (a.user_id, (s.started_at at time zone 'Europe/Berlin')::date, a.question_id)
       a.user_id,
       (s.started_at at time zone 'Europe/Berlin')::date,
       a.question_id,
       a.xp_earned,
       a.is_correct,
       a.created_at
from public.quiz_attempts a
join public.quiz_sessions s on s.id = a.quiz_session_id
where s.session_type = 'daily'
order by a.user_id,
         (s.started_at at time zone 'Europe/Berlin')::date,
         a.question_id,
         a.created_at
on conflict do nothing;


-- --- Die Abrechnung ----------------------------------------------------------

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
  v_quiz_day date;
  v_claimed integer;
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

  -- Was die Antwort wert waere.
  if not new.is_correct then
    v_xp := 0;
  elsif v_is_daily then
    -- Im Daily zahlt auch eine laengst bekannte Frage: die fuenf sucht der
    -- Server aus, man kann ihnen nicht ausweichen.
    v_xp := public.xp_for_answer(true, v_difficulty) * 2;
  elsif v_already_correct then
    v_xp := 0;
  else
    v_xp := public.xp_for_answer(true, v_difficulty);
    if v_session.session_type = 'duel' then
      v_xp := round(v_xp * 1.5);
    end if;
  end if;

  -- Und ob sie ueberhaupt noch abzurechnen ist. Der Konflikt ist die Sperre.
  if v_is_daily then
    v_quiz_day := (v_session.started_at at time zone 'Europe/Berlin')::date;

    insert into public.daily_question_payouts (user_id, quiz_day, question_id, xp, was_correct)
    values (new.user_id, v_quiz_day, new.question_id, v_xp, new.is_correct)
    on conflict (user_id, quiz_day, question_id) do nothing;

    get diagnostics v_claimed = row_count;
    if v_claimed = 0 then
      -- Diese Frage ist an diesem Tag schon abgerechnet – richtig oder falsch.
      v_xp := 0;
    end if;
  end if;

  new.xp_earned := v_xp;
  return new;
end;
$$;


-- --- Perfekt ist eine Runde erst, wenn sie ganz gespielt wurde ----------------
--
-- Die bisherige Fassung verlangte "mindestens eine Antwort und keine falsche".
-- Eine Runde, in der eine von fuenf Fragen richtig war und die danach
-- abgebrochen wurde, galt damit als perfekt – und das Gluecksrad stand bereit.
--
-- Der naheliegende Vergleich mit `total_questions` waere kein Fortschritt:
-- diese Zahl kommt aus dem Client-INSERT. Geprueft wird deshalb gegen das
-- serverseitige Fragenset. Fuer Runden ohne Set – alles von vor heute – bleibt
-- die alte Bedingung, ergaenzt um die Vollstaendigkeit.

create or replace function public.daily_quiz_was_perfect()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.quiz_sessions s
    where s.user_id = auth.uid()
      and s.session_type = 'daily'
      and s.completed_at is not null
      and (s.started_at at time zone 'Europe/Berlin')::date = public.daily_quiz_day()
      and exists (select 1 from public.quiz_attempts a where a.quiz_session_id = s.id)
      and not exists (
        select 1 from public.quiz_attempts a
        where a.quiz_session_id = s.id and not a.is_correct
      )
      and case
        when s.question_set_enforced then
          -- Jede Frage des Sets ist richtig beantwortet.
          not exists (
            select 1 from public.quiz_session_questions sq
            where sq.quiz_session_id = s.id
              and not exists (
                select 1 from public.quiz_attempts a
                where a.quiz_session_id = s.id
                  and a.question_id = sq.question_id
                  and a.is_correct
              )
          )
        else
          (select count(*) from public.quiz_attempts a where a.quiz_session_id = s.id)
            = s.total_questions
      end
  );
$$;

revoke all on function public.daily_quiz_was_perfect() from public, anon;
grant execute on function public.daily_quiz_was_perfect() to authenticated;
