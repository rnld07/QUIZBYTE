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


select public.__act_reset();
drop table public.__ids;
drop function public.__act_as(uuid, text);
drop function public.__act_without_subject(text);
drop function public.__act_reset();
select 'SECURITY TESTS PASSED' as result;
