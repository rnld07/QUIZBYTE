-- Access-control regression tests. Executed after smoke.sql by verify-local.sh.
--
-- Every case here failed – or would have failed to fail – before the hardening
-- migrations of 2026-09-19. Where a check has two layers (a privilege and a
-- rule), both are asserted separately: a rule that is never reached because the
-- privilege already blocks the call proves nothing about the rule.
\set ON_ERROR_STOP on

-- Helpers. Same idea as in smoke.sql, different names so both files can run.
create or replace function public.__act_as(p_user uuid, p_role text default 'authenticated')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', p_role)::text, false);
  perform set_config('request.jwt.claim.sub', p_user::text, false);
  execute format('set role %I', p_role);
end $$;

-- A session with a role but without a subject: exactly what an unauthenticated
-- PostgREST request looks like. auth.uid() is NULL here.
create or replace function public.__act_without_subject(p_role text default 'authenticated')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  perform set_config('request.jwt.claim.sub', '', false);
  execute format('set role %I', p_role);
end $$;

create or replace function public.__act_reset()
returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', false);
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

-- Ids that later blocks need. A plain table, not a temp one, so the impersonated
-- roles can read it without touching the temp schema.
create table public.__ids (key text primary key, id uuid not null);
grant select, insert, update on public.__ids to authenticated, anon;

insert into auth.users (id, email, is_anonymous) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'sec-one@example.com', false),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'sec-two@example.com', false),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'sec-admin@example.com', false);

update public.profiles set role = 'admin' where id = 'bbbbbbbb-0000-4000-8000-000000000003';


-- 1. The privileges themselves -------------------------------------------------
-- Not the policy, not the trigger: what the role may actually write.
do $$
begin
  assert not has_column_privilege('authenticated', 'public.quiz_sessions', 'xp_earned', 'INSERT'),
    'authenticated must not be able to insert xp_earned';
  assert not has_column_privilege('authenticated', 'public.quiz_sessions', 'correct_answers', 'INSERT'),
    'authenticated must not be able to insert correct_answers';
  assert not has_column_privilege('authenticated', 'public.quiz_sessions', 'completed_at', 'INSERT'),
    'authenticated must not be able to insert completed_at';
  assert has_column_privilege('authenticated', 'public.quiz_sessions', 'total_questions', 'INSERT'),
    'authenticated still starts rounds';
  assert not has_table_privilege('authenticated', 'public.quiz_sessions', 'UPDATE'),
    'sessions are never updated by the client';

  assert not has_column_privilege('authenticated', 'public.quiz_attempts', 'is_correct', 'INSERT'),
    'the server decides whether an answer is correct';
  assert not has_column_privilege('authenticated', 'public.quiz_attempts', 'xp_earned', 'INSERT'),
    'the server decides the xp';
  assert has_column_privilege('authenticated', 'public.quiz_attempts', 'selected_answer', 'INSERT'),
    'authenticated still answers';

  assert not has_table_privilege('authenticated', 'public.friendships', 'INSERT'),
    'friendships are written by the rpcs only';
  assert not has_table_privilege('authenticated', 'public.friendships', 'UPDATE'),
    'friendships are written by the rpcs only';
  assert not has_table_privilege('authenticated', 'public.friendships', 'DELETE'),
    'friendships are written by the rpcs only';

  assert not has_function_privilege('anon', 'public.complete_quiz_session(uuid)', 'EXECUTE'),
    'anon cannot complete rounds';
  assert not has_function_privilege('anon', 'public.decline_duel(uuid)', 'EXECUTE'),
    'anon cannot decline duels';
  assert not has_function_privilege('authenticated',
    'public.log_admin_action(public.admin_action_kind, text, uuid)', 'EXECUTE'),
    'the audit log is not writable from the api';
  assert has_function_privilege('anon', 'public.get_feature_flags()', 'EXECUTE'),
    'feature flags are read before signing in';
end $$;


-- 2. A round cannot be started with a result ------------------------------------
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000001');

do $$
declare v_blocked boolean := false; v_session uuid;
begin
  begin
    insert into public.quiz_sessions (user_id, session_type, total_questions, xp_earned, completed_at)
    values (auth.uid(), 'random', 2, 999, now());
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'a round cannot be inserted with xp and a completion date';

  -- The ordinary way still works, and starts neutral.
  insert into public.quiz_sessions (user_id, session_type, total_questions)
  values (auth.uid(), 'random', 2)
  returning id into v_session;
  insert into public.__ids values ('session', v_session);

  assert (select xp_earned from public.quiz_sessions where id = v_session) = 0, 'new rounds start at zero';
  assert (select completed_at from public.quiz_sessions where id = v_session) is null, 'new rounds start open';
end $$;

do $$
declare v_blocked boolean := false; v_question uuid; v_session uuid;
begin
  select id into v_session from public.__ids where key = 'session';
  select id into v_question from public.questions where status = 'published' order by id limit 1;
  insert into public.__ids values ('question', v_question);

  begin
    insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer, is_correct, xp_earned)
    values (auth.uid(), v_question, v_session, 'A', true, 9999);
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'an answer cannot be inserted with its own verdict';

  -- Without those columns it goes through and the server fills them in.
  insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer)
  values (auth.uid(), v_question, v_session, 'A');
  assert (select count(*) from public.quiz_attempts where quiz_session_id = v_session) = 1,
    'the ordinary answer still works';
end $$;


-- 3. Friendships are written by the functions, not by the client ----------------
do $$
declare v_blocked boolean := false;
begin
  begin
    insert into public.friendships (requester_id, addressee_id, status)
    values (auth.uid(), 'bbbbbbbb-0000-4000-8000-000000000002', 'accepted');
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'a friendship cannot be self-granted';

  -- The intended way, unchanged.
  insert into public.__ids values ('friendship', public.send_friend_request('bbbbbbbb-0000-4000-8000-000000000002'));
  assert not public.are_friends(auth.uid(), 'bbbbbbbb-0000-4000-8000-000000000002'),
    'a request is not yet a friendship';
end $$;

select public.__act_as('bbbbbbbb-0000-4000-8000-000000000002');

do $$
begin
  perform public.respond_friend_request((select id from public.__ids where key = 'friendship'), true);
  assert public.are_friends(auth.uid(), 'bbbbbbbb-0000-4000-8000-000000000001'),
    'accepting still works';

  -- Something to point the null-safety tests at.
  insert into public.__ids values ('duel', public.create_duel('bbbbbbbb-0000-4000-8000-000000000001', 'classic'));
  insert into public.__ids values ('message', public.send_question_to_friend(
    'bbbbbbbb-0000-4000-8000-000000000001',
    (select id from public.__ids where key = 'question')));
end $$;


-- 4. No subject, no owner -------------------------------------------------------
-- The bug these three share: `v_row.user_id <> auth.uid()` is NULL when nobody
-- is signed in, and `if NULL then` does not raise.
select public.__act_reset();
select public.__act_without_subject('authenticated');

do $$
declare v_blocked boolean;
begin
  assert auth.uid() is null, 'this block runs without a subject';

  v_blocked := false;
  begin
    perform public.complete_quiz_session((select id from public.__ids where key = 'session'));
  exception when others then v_blocked := true;
  end;
  assert v_blocked, 'a foreign round cannot be completed anonymously';

  v_blocked := false;
  begin
    perform public.decline_duel((select id from public.__ids where key = 'duel'));
  exception when others then v_blocked := true;
  end;
  assert v_blocked, 'a foreign duel cannot be declined anonymously';

  v_blocked := false;
  begin
    perform public.answer_shared_question((select id from public.__ids where key = 'message'), 'A');
  exception when others then v_blocked := true;
  end;
  assert v_blocked, 'a shared question cannot be answered anonymously';
end $$;

-- And nothing of it happened. Checked without a role, because with auth.uid()
-- NULL the rules hide the rows and an empty result would assert just as happily.
select public.__act_reset();

do $$
begin
  assert (select completed_at from public.quiz_sessions
          where id = (select id from public.__ids where key = 'session')) is null,
    'the round is still open';
  assert (select status from public.duels where id = (select id from public.__ids where key = 'duel'))
    <> 'declined', 'the duel still stands';
  assert not exists (select 1 from public.shared_question_answers
                      where message_id = (select id from public.__ids where key = 'message')),
    'the shared question is still unanswered';
end $$;


-- 5. The anon role does not reach these functions at all ------------------------
select public.__act_without_subject('anon');

do $$
declare v_blocked boolean := false;
begin
  begin
    perform public.complete_quiz_session((select id from public.__ids where key = 'session'));
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'anon has no execute privilege on complete_quiz_session';
end $$;


-- 6. A block ends the friendship everywhere -------------------------------------
-- block_user() deletes the row, so the row plus the block is a state the app
-- cannot produce. It is written here on purpose: are_friends() has to answer
-- correctly even then, because every visibility rule hangs on it.
select public.__act_reset();

insert into public.user_blocks (blocker_id, blocked_id)
values ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000001');

insert into public.friendships (requester_id, addressee_id, status, responded_at)
values ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'accepted', now())
on conflict do nothing;

do $$
begin
  assert not public.are_friends('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002'),
    'a block ends the friendship even when the row survives';
end $$;

-- And an open request cannot be accepted past a block.
insert into auth.users (id, email, is_anonymous)
values ('bbbbbbbb-0000-4000-8000-000000000004', 'sec-four@example.com', false);

insert into public.user_blocks (blocker_id, blocked_id)
values ('bbbbbbbb-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000003');

insert into public.friendships (requester_id, addressee_id, status)
values ('bbbbbbbb-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000004', 'pending');

select public.__act_as('bbbbbbbb-0000-4000-8000-000000000004');

do $$
declare v_blocked boolean := false;
begin
  begin
    perform public.respond_friend_request(
      (select id from public.friendships
        where requester_id = 'bbbbbbbb-0000-4000-8000-000000000003'
          and addressee_id = 'bbbbbbbb-0000-4000-8000-000000000004'),
      true);
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'a blocked request cannot be accepted';
end $$;


-- 7. A suspended account starts nothing -----------------------------------------
select public.__act_reset();
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000003');

do $$
begin
  perform public.admin_suspend_user('bbbbbbbb-0000-4000-8000-000000000001', 'security.sql');
  assert public.is_suspended('bbbbbbbb-0000-4000-8000-000000000001'), 'the suspension took';
end $$;

select public.__act_reset();
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000001');

do $$
declare v_blocked boolean;
begin
  v_blocked := false;
  begin
    perform public.send_question_to_friend('bbbbbbbb-0000-4000-8000-000000000002',
      (select id from public.__ids where key = 'question'));
  exception when others then v_blocked := true;
  end;
  assert v_blocked, 'a suspended account shares nothing';

  v_blocked := false;
  begin
    perform public.create_duel('bbbbbbbb-0000-4000-8000-000000000002', 'classic');
  exception when others then v_blocked := true;
  end;
  assert v_blocked, 'a suspended account challenges nobody';

  v_blocked := false;
  begin
    insert into public.quiz_sessions (user_id, session_type, total_questions)
    values (auth.uid(), 'random', 2);
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'a suspended account starts no rounds';

  -- What it may still do: finish what it started.
  perform public.complete_quiz_session((select id from public.__ids where key = 'session'));
  assert (select completed_at from public.quiz_sessions
          where id = (select id from public.__ids where key = 'session')) is not null,
    'a running round can still be closed';
end $$;


-- 8. The audit log is not a public notepad --------------------------------------
select public.__act_reset();
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000002');

do $$
declare v_blocked boolean := false; v_before bigint;
begin
  select count(*) into v_before from public.admin_actions;
  begin
    perform public.log_admin_action('suspend_user', 'not me', null);
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'a normal account cannot write the audit log';
  assert (select count(*) from public.admin_actions) = v_before, 'and nothing was written';
end $$;


-- 9. A round knows which questions belong to it --------------------------------
select public.__act_reset();

insert into auth.users (id, email, is_anonymous) values
  ('bbbbbbbb-0000-4000-8000-000000000005', 'sec-daily@example.com', false),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'sec-duel@example.com', false);

select public.__act_as('bbbbbbbb-0000-4000-8000-000000000005');

do $$
declare
  v_payload jsonb;
  v_session uuid;
  v_first uuid;
  v_outsider uuid;
  v_blocked boolean := false;
  v_result jsonb;
begin
  v_payload := public.start_daily_round();
  v_session := (v_payload ->> 'session_id')::uuid;
  insert into public.__ids values ('daily_a', v_session);

  assert jsonb_array_length(v_payload -> 'questions') = 5,
    format('the daily round has five questions, got %s', jsonb_array_length(v_payload -> 'questions'));
  assert (select question_set_enforced from public.quiz_sessions where id = v_session),
    'a round started on the server carries its question set';
  assert (select count(*) from public.quiz_session_questions where quiz_session_id = v_session) = 5,
    'and the set is stored';

  -- Die Loesung ist im Solo-Modus dabei: die Runde wird auf dem Geraet
  -- ausgewertet, auch ohne Verbindung.
  assert (v_payload -> 'questions' -> 0 ? 'correct_answer'),
    'a solo round still carries the solution';

  -- Eine Frage, die nicht zur Runde gehoert, wird abgewiesen.
  select q.id into v_outsider
  from public.questions q
  where q.status = 'published'
    and not exists (
      select 1 from public.quiz_session_questions sq
      where sq.quiz_session_id = v_session and sq.question_id = q.id
    )
  limit 1;

  begin
    perform public.submit_attempt(v_session, v_outsider, 'A');
  exception when check_violation then v_blocked := true;
  end;
  assert v_blocked, 'a question outside the round is rejected';

  -- Eine Frage aus der Runde geht durch, und die Abgabe sagt, was richtig war.
  select sq.question_id into v_first
  from public.quiz_session_questions sq
  where sq.quiz_session_id = v_session
  order by sq.sort_position
  limit 1;
  insert into public.__ids values ('daily_q1', v_first);

  v_result := public.submit_attempt(v_session, v_first, 'A');
  assert v_result ? 'correct_answer', 'the answer comes back with the solution';
  assert v_result ? 'explanation', 'and with the explanation';
end $$;


-- 10. A daily question pays once per day ----------------------------------------
do $$
declare
  v_q1 uuid;
  v_first_xp integer;
  v_was_correct boolean;
  v_payload jsonb;
  v_session_b uuid;
  v_second uuid;
  v_result jsonb;
begin
  select id into v_q1 from public.__ids where key = 'daily_q1';

  select xp, was_correct into v_first_xp, v_was_correct
  from public.daily_question_payouts
  where user_id = auth.uid() and question_id = v_q1;
  assert found, 'the first attempt is on the ledger';

  -- Zweite Runde am selben Tag, dieselbe Frage.
  v_payload := public.start_daily_round();
  v_session_b := (v_payload ->> 'session_id')::uuid;

  v_result := public.submit_attempt(v_session_b, v_q1, 'B');
  assert (v_result ->> 'xp_earned')::int = 0,
    format('the second answer to the same daily question pays nothing, got %s', v_result ->> 'xp_earned');

  -- Und die Ledger-Zeile bleibt die des ersten Versuchs.
  assert (select xp from public.daily_question_payouts
          where user_id = auth.uid() and question_id = v_q1) = v_first_xp,
    'the ledger keeps the first result';
  assert (select was_correct from public.daily_question_payouts
          where user_id = auth.uid() and question_id = v_q1) = v_was_correct,
    'including whether it was right';

  -- Eine andere Frage desselben Tages zahlt dagegen.
  select sq.question_id into v_second
  from public.quiz_session_questions sq
  where sq.quiz_session_id = v_session_b and sq.question_id <> v_q1
  order by sq.sort_position
  limit 1;

  v_result := public.submit_attempt(
    v_session_b,
    v_second,
    (select correct_answer from public.questions where id = v_second));
  assert (v_result ->> 'is_correct')::boolean, 'the right answer is recognised';
  assert (v_result ->> 'xp_earned')::int > 0,
    'a question not yet settled still pays in the second round';

  -- Und eine unvollstaendige Runde ist nicht perfekt.
  assert not public.daily_quiz_was_perfect(), 'an unfinished daily round is not perfect';
end $$;


-- 11. A wrong first answer uses the question up ---------------------------------
select public.__act_reset();
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000006');

do $$
declare
  v_payload jsonb;
  v_session uuid;
  v_q uuid;
  v_correct public.answer_key;
  v_wrong public.answer_key;
  v_result jsonb;
  v_session_b uuid;
begin
  v_payload := public.start_daily_round();
  v_session := (v_payload ->> 'session_id')::uuid;

  select sq.question_id into v_q
  from public.quiz_session_questions sq
  where sq.quiz_session_id = v_session
  order by sq.sort_position
  limit 1;

  select correct_answer into v_correct from public.questions where id = v_q;
  v_wrong := case when v_correct = 'A' then 'B'::public.answer_key else 'A'::public.answer_key end;

  v_result := public.submit_attempt(v_session, v_q, v_wrong);
  assert not (v_result ->> 'is_correct')::boolean, 'the wrong answer is recognised';
  assert (v_result ->> 'xp_earned')::int = 0, 'and pays nothing';

  assert (select was_correct from public.daily_question_payouts
          where user_id = auth.uid() and question_id = v_q) = false,
    'the ledger records the first attempt even when it was wrong';

  -- Zweite Runde, diesmal richtig: der Tag ist fuer diese Frage verbraucht.
  v_payload := public.start_daily_round();
  v_session_b := (v_payload ->> 'session_id')::uuid;
  v_result := public.submit_attempt(v_session_b, v_q, v_correct);
  assert (v_result ->> 'is_correct')::boolean, 'the answer is right this time';
  assert (v_result ->> 'xp_earned')::int = 0,
    'but the question is settled for today, so it pays nothing';
end $$;


-- 12. A duel round comes without the solution -----------------------------------
select public.__act_reset();
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000005');

do $$
declare v_id uuid;
begin
  -- Erst Freunde, dann Duell.
  v_id := public.send_friend_request('bbbbbbbb-0000-4000-8000-000000000006');
  insert into public.__ids values ('duel_friendship', v_id);
end $$;

select public.__act_as('bbbbbbbb-0000-4000-8000-000000000006');

do $$
declare v_duel uuid;
begin
  perform public.respond_friend_request((select id from public.__ids where key = 'duel_friendship'), true);
  v_duel := public.create_duel('bbbbbbbb-0000-4000-8000-000000000005', 'classic');
  insert into public.__ids values ('duel_b', v_duel);
end $$;

select public.__act_as('bbbbbbbb-0000-4000-8000-000000000005');

do $$
declare
  v_duel uuid;
  v_payload jsonb;
  v_session uuid;
  v_blocked boolean := false;
  v_question jsonb;
begin
  select id into v_duel from public.__ids where key = 'duel_b';

  v_payload := public.start_duel_round(v_duel);
  v_session := (v_payload ->> 'session_id')::uuid;
  v_question := v_payload -> 'questions' -> 0;

  assert not (v_question ? 'correct_answer'), 'a duel question carries no solution';
  assert not (v_question ? 'explanation'), 'and no explanation either';
  assert v_question ? 'question_text', 'but everything needed to play';

  assert (select challenger_session_id from public.duels where id = v_duel) is not null
      or (select opponent_session_id from public.duels where id = v_duel) is not null,
    'the round is bound to the duel';
  assert (select status from public.duels where id = v_duel) = 'active', 'and the duel is running';

  -- Ein zweites Mal geht nicht.
  begin
    perform public.start_duel_round(v_duel);
  exception when check_violation then v_blocked := true;
  end;
  assert v_blocked, 'a duel side is played once';

  -- Die Abgabe sagt, was richtig war.
  declare
    v_q uuid;
    v_result jsonb;
  begin
    select sq.question_id into v_q from public.quiz_session_questions sq
    where sq.quiz_session_id = v_session order by sq.sort_position limit 1;
    v_result := public.submit_attempt(v_session, v_q, 'A');
    assert v_result ? 'correct_answer', 'the duel answer comes back with the solution';
    -- Und noch einmal dieselbe Antwort: dasselbe Ergebnis, kein Fehler.
    assert public.submit_attempt(v_session, v_q, 'A') ->> 'is_correct'
         = (v_result ->> 'is_correct'),
      'sending the same answer twice returns the same result';
  end;
end $$;

-- Ein Unbeteiligter kommt nicht an die Runde.
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000002');

do $$
declare v_blocked boolean := false;
begin
  begin
    perform public.start_duel_round((select id from public.__ids where key = 'duel_b'));
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'only the two of them play their duel';
end $$;


-- 13. Old rounds keep working ----------------------------------------------------
-- Alles von vor dieser Migration hat kein Fragenset. Der Trigger laesst es
-- unveraendert durch – sonst braechen laufende Runden und Antworten, die noch
-- in einer Offline-Warteschlange liegen.
select public.__act_reset();
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000002');

do $$
declare v_session uuid; v_question uuid;
begin
  insert into public.quiz_sessions (user_id, session_type, total_questions)
  values (auth.uid(), 'random', 2)
  returning id into v_session;

  assert not (select question_set_enforced from public.quiz_sessions where id = v_session),
    'a round created the old way has no set';

  select id into v_question from public.questions where status = 'published' order by id desc limit 1;
  insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer)
  values (auth.uid(), v_question, v_session, 'A');

  assert (select count(*) from public.quiz_attempts where quiz_session_id = v_session) = 1,
    'and any published question is still accepted there';
end $$;


-- 14. The other round types, too ------------------------------------------------
select public.__act_reset();
select public.__act_as('bbbbbbbb-0000-4000-8000-000000000005');

do $$
declare
  v_payload jsonb;
  v_session uuid;
  v_outsider uuid;
  v_blocked boolean := false;
begin
  v_payload := public.start_quiz_round('category', 'classic', 2, '1f000000-0000-4000-8000-000000000001');
  v_session := (v_payload ->> 'session_id')::uuid;
  insert into public.__ids values ('category_round', v_session);

  assert (select question_set_enforced from public.quiz_sessions where id = v_session),
    'a category round carries its set too';
  assert (select session_type from public.quiz_sessions where id = v_session) = 'category',
    'and the type the client asked for';
  assert jsonb_array_length(v_payload -> 'questions') > 0, 'with questions in it';

  select q.id into v_outsider
  from public.questions q
  where q.status = 'published'
    and not exists (
      select 1 from public.quiz_session_questions sq
      where sq.quiz_session_id = v_session and sq.question_id = q.id
    )
  limit 1;

  begin
    perform public.submit_attempt(v_session, v_outsider, 'A');
  exception when check_violation then v_blocked := true;
  end;
  assert v_blocked, 'a question outside a category round is rejected as well';
end $$;

-- Die Schwierigkeit ist eine Auswahl, kein Vorschlag.
do $$
declare v_payload jsonb; v_session uuid;
begin
  v_payload := public.start_quiz_round(
    'category', 'classic', 1, '1f000000-0000-4000-8000-000000000001', array['hard']::public.difficulty_level[]);
  v_session := (v_payload ->> 'session_id')::uuid;

  assert not exists (
    select 1
    from public.quiz_session_questions sq
    join public.questions q on q.id = sq.question_id
    where sq.quiz_session_id = v_session and q.difficulty <> 'hard'
  ), 'a round asked for hard questions contains only hard ones';
end $$;

-- Eine Wiederholung nimmt nur, was dem Nutzer gehoert.
do $$
declare
  v_foreign uuid;
  v_mine uuid;
  v_payload jsonb;
  v_blocked boolean := false;
begin
  select id into v_mine from public.__ids where key = 'daily_q1';

  select q.id into v_foreign
  from public.questions q
  where q.status = 'published'
    and not exists (select 1 from public.quiz_attempts a where a.question_id = q.id and a.user_id = auth.uid())
    and not exists (select 1 from public.saved_questions s where s.question_id = q.id and s.user_id = auth.uid())
  limit 1;

  -- Nur eine fremde Frage: daraus wird gar keine Runde.
  begin
    perform public.start_quiz_round(
      'weakness', 'classic', 5, null, null, false, '{}', '{}', '{}', array[v_foreign]);
  exception when no_data_found then v_blocked := true;
  end;
  assert v_blocked, 'a replay of a question never touched does not start';

  -- Mit einer eigenen dazwischen bleibt genau die eigene uebrig.
  v_payload := public.start_quiz_round(
    'weakness', 'classic', 5, null, null, false, '{}', '{}', '{}', array[v_foreign, v_mine]);
  assert jsonb_array_length(v_payload -> 'questions') = 1, 'the foreign id is dropped, the own one stays';
  assert (v_payload -> 'questions' -> 0 ->> 'id')::uuid = v_mine, 'and it is the right one';
end $$;

-- Eine gespeicherte Frage darf wiederholt werden, auch ungespielt.
do $$
declare v_saved uuid; v_payload jsonb;
begin
  select q.id into v_saved
  from public.questions q
  where q.status = 'published'
    and not exists (select 1 from public.quiz_attempts a where a.question_id = q.id and a.user_id = auth.uid())
  limit 1;

  insert into public.saved_questions (user_id, question_id) values (auth.uid(), v_saved)
  on conflict do nothing;

  v_payload := public.start_quiz_round(
    'weakness', 'classic', 5, null, null, false, '{}', '{}', '{}', array[v_saved]);
  assert jsonb_array_length(v_payload -> 'questions') = 1, 'a saved question can be replayed';
end $$;


-- 15. Changing the difficulty mid-round ------------------------------------------
do $$
declare
  v_session uuid;
  v_first uuid;
  v_replaced uuid;
  v_payload jsonb;
  v_blocked boolean := false;
begin
  select id into v_session from public.__ids where key = 'category_round';

  -- Eine Frage beantworten, damit es etwas zu behalten gibt.
  select sq.question_id into v_first
  from public.quiz_session_questions sq
  where sq.quiz_session_id = v_session order by sq.sort_position limit 1;
  perform public.submit_attempt(v_session, v_first, 'A');

  -- Die zweite Frage ist die, die getauscht werden kann.
  select sq.question_id into v_replaced
  from public.quiz_session_questions sq
  where sq.quiz_session_id = v_session and sq.sort_position = 2;

  v_payload := public.retune_quiz_round(v_session, array['hard']::public.difficulty_level[]);

  assert (select question_id from public.quiz_session_questions
          where quiz_session_id = v_session and sort_position = 1) = v_first,
    'the answered question keeps its place';

  if v_replaced is not null
     and not exists (select 1 from public.quiz_session_questions
                     where quiz_session_id = v_session and question_id = v_replaced) then
    -- Was aus der Runde geflogen ist, wird als Antwort abgewiesen.
    begin
      perform public.submit_attempt(v_session, v_replaced, 'A');
    exception when check_violation then v_blocked := true;
    end;
    assert v_blocked, 'a question swapped out is no longer part of the round';
  end if;

  assert jsonb_array_length(v_payload -> 'questions') > 0, 'and the round still has questions';
end $$;

-- Ein Tagesquiz laesst sich nicht umstellen: sein Satz steht.
do $$
declare v_blocked boolean := false;
begin
  begin
    perform public.retune_quiz_round(
      (select id from public.__ids where key = 'daily_a'), array['easy']::public.difficulty_level[]);
  exception when check_violation then v_blocked := true;
  end;
  assert v_blocked, 'the daily round keeps its questions';
end $$;


-- 16. A duel question stays out of every solo round -----------------------------
-- Der Kern der Sache: solange Duell- und Solo-Fragen aus demselben Bestand
-- kommen, laesst sich die Loesung ueber eine Solo-Runde einsammeln. Eine Frage
-- im Duellbestand darf deshalb auf keinem Solo-Weg auftauchen.
select public.__act_reset();

update public.questions set duel_pool = true where id = '2f000000-0000-4000-8000-000000000003';

select public.__act_as('bbbbbbbb-0000-4000-8000-000000000005');

do $$
declare
  v_duel_question uuid := '2f000000-0000-4000-8000-000000000003';
  v_blocked boolean;
  v_payload jsonb;
begin
  assert not exists (
    select 1 from public.get_session_questions('1f000000-0000-4000-8000-000000000001', 100) q
    where q.id = v_duel_question
  ), 'a duel question is not drawn for a category round';

  assert not exists (
    select 1 from public.get_training_questions(array['Smoke'], '{}', '{}', 100) q
    where q.id = v_duel_question
  ), 'nor for training';

  assert not exists (
    select 1 from public.get_daily_questions(50) q where q.id = v_duel_question
  ), 'nor for the daily quiz';

  -- Auch nicht ueber den Umweg: speichern und als Wiederholung anfordern.
  insert into public.saved_questions (user_id, question_id) values (auth.uid(), v_duel_question)
  on conflict do nothing;

  assert not exists (
    select 1 from public.get_my_saved_questions(100) q where q.id = v_duel_question
  ), 'nor in the saved list';

  v_blocked := false;
  begin
    perform public.start_quiz_round(
      'weakness', 'classic', 5, null, null, false, '{}', '{}', '{}', array[v_duel_question]);
  exception when no_data_found then v_blocked := true;
  end;
  assert v_blocked, 'and a replay of it does not start either';

  -- Und im Chat ist sie nicht teilbar.
  v_blocked := false;
  begin
    perform public.send_question_to_friend('bbbbbbbb-0000-4000-8000-000000000006', v_duel_question);
  exception when foreign_key_violation then v_blocked := true;
  end;
  assert v_blocked, 'and it cannot be shared in a chat';

  -- Die uebrigen Runden laufen weiter: ein Bestand, der noch zu klein ist,
  -- darf das Spiel nicht anhalten.
  v_payload := public.start_quiz_round('random', 'classic', 3);
  assert jsonb_array_length(v_payload -> 'questions') > 0, 'an ordinary round still starts';
end $$;

select public.__act_reset();

do $$
begin
  assert public.duel_pool_size() < public.duel_pool_minimum(),
    'with one marked question the pool is still below the minimum';
end $$;


select public.__act_reset();
drop table public.__ids;
drop function public.__act_as(uuid, text);
drop function public.__act_without_subject(text);
drop function public.__act_reset();
select 'SECURITY TESTS PASSED' as result;
