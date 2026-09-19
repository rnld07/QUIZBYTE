-- RLS / trigger smoke tests. Executed after migrations + seed by verify-local.sh.
\set ON_ERROR_STOP on

-- Helper to impersonate an API user like PostgREST does.
create or replace function public.__impersonate(p_user uuid, p_role text default 'authenticated')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', p_role)::text, false);
  perform set_config('request.jwt.claim.sub', p_user::text, false);
  execute format('set role %I', p_role);
end $$;

create or replace function public.__reset_role()
returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', false);
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

-- 1. Users are created with profile + progress ----------------------------------------------
insert into auth.users (id, email, is_anonymous) values
  ('aaaaaaaa-0000-4000-8000-000000000001', null, true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'admin@example.com', false),
  ('aaaaaaaa-0000-4000-8000-000000000003', null, true);

do $$
declare v_count int;
begin
  select count(*) into v_count from public.profiles;
  assert v_count = 3, 'profiles should be auto-created';
  select count(*) into v_count from public.user_progress;
  assert v_count = 3, 'user_progress should be auto-created';
  assert (select is_anonymous from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'guest flagged anonymous';
  assert (select username from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001') ~ '^user_[0-9a-f]{8}$', 'generated username format';
end $$;

update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-4000-8000-000000000002';

-- 1b. Fixtures for the quiz rules --------------------------------------------------------------
-- The scoring assertions below run against these three questions, not against the
-- seeded content. Editorial numbers change with every content commit, and a smoke
-- test that fails when a question is added tests the seed, not the rules.
insert into public.categories (id, slug, name, is_active)
values ('1f000000-0000-4000-8000-000000000001', 'smoke', 'Smoke', true);

insert into public.questions
  (id, category_id, subcategory, question_text, answer_a, answer_b, answer_c, answer_d,
   correct_answer, explanation, difficulty, tags, status)
values
  ('2f000000-0000-4000-8000-000000000001', '1f000000-0000-4000-8000-000000000001', 'Smoke',
   'Fixture easy', 'a', 'b', 'c', 'd', 'A', 'Fixture', 'easy', array['smoke', 'smoke-easy'], 'published'),
  ('2f000000-0000-4000-8000-000000000002', '1f000000-0000-4000-8000-000000000001', 'Smoke',
   'Fixture medium', 'a', 'b', 'c', 'd', 'B', 'Fixture', 'medium', array['smoke'], 'published'),
  ('2f000000-0000-4000-8000-000000000003', '1f000000-0000-4000-8000-000000000001', 'Smoke',
   'Fixture hard', 'a', 'b', 'c', 'd', 'C', 'Fixture', 'hard', array['smoke'], 'published');

-- 2. Regular user: read access -----------------------------------------------------------------
select public.__impersonate('aaaaaaaa-0000-4000-8000-000000000001');

do $$
declare v_count int; v_total int;
begin
  -- Both counts are compared against the tables instead of a fixed number: the
  -- point of the view is that it shows exactly what the user may see, and that
  -- stays true however many questions the editors add.
  select count(*) into v_count from public.categories_overview;
  assert v_count = (select count(*) from public.categories),
    format('overview lists every visible category, got %s', v_count);
  select sum(published_question_count) into v_total from public.categories_overview;
  assert v_total = (select count(*) from public.questions),
    format('overview counts every visible question, got %s', v_total);
  select count(*) into v_count from public.questions where status <> 'published';
  assert v_count = 0, 'users never see unpublished questions';
  select count(*) into v_count from public.profiles;
  assert v_count = 1, 'users only see their own profile';
  assert public.is_admin() = false, 'regular user is not admin';
end $$;

-- 3. Regular user: writes to content are blocked ----------------------------------------------------
do $$
declare v_rows int; v_blocked boolean := false;
begin
  update public.questions set question_text = 'hacked' where id = '20000000-0000-4000-8000-000000000001';
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'RLS must filter out question updates for users';

  begin
    insert into public.categories (slug, name) values ('hack', 'Hack');
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'users cannot insert categories';

  v_blocked := false;
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'users cannot change their role';

  update public.user_progress set total_xp = 999999 where user_id = auth.uid();
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'users cannot write user_progress';

  v_blocked := false;
  begin
    perform public.get_admin_dashboard_stats();
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'admin stats blocked for users';
end $$;

-- 4. Profile editing + username rules -------------------------------------------------------------------
do $$
declare v_blocked boolean := false;
begin
  update public.profiles set username = 'ronald_07', display_name = 'Ronald' where id = auth.uid();
  assert (select username from public.profiles where id = auth.uid()) = 'ronald_07';
  assert public.is_username_available('RONALD_07') = true, 'own username counts as available';
  begin
    update public.profiles set username = 'Bad Name' where id = auth.uid();
  exception when check_violation then v_blocked := true;
  end;
  assert v_blocked, 'invalid username rejected';
end $$;

-- 5. Quiz flow: session, attempts, scoring, streak, completion --------------------------------------------
do $$
declare
  v_session uuid;
  v_attempt public.quiz_attempts%rowtype;
  v_progress public.user_progress%rowtype;
  v_result jsonb;
  v_blocked boolean := false;
  v_count int;
begin
  select count(*) into v_count from public.get_session_questions('1f000000-0000-4000-8000-000000000001', 10);
  assert v_count = 3, format('a category returns exactly its published questions, got %s', v_count);
  select count(*) into v_count from public.get_session_questions(null, 10);
  assert v_count = 10, 'random session returns 10 questions';
  select count(*) into v_count from public.get_training_questions(array['Smoke'], array['smoke-easy'], '{}', 30);
  assert v_count = 3, format('training pool by subcategory/tag, got %s', v_count);

  insert into public.quiz_sessions (user_id, category_id, session_type, total_questions)
  values (auth.uid(), '1f000000-0000-4000-8000-000000000001', 'category', 2)
  returning id into v_session;

  -- is_correct and xp_earned are the server's; since 20260919007700 the client
  -- cannot even name those columns (security.sql proves that). What is checked
  -- here is the arithmetic: xp_for_answer() gives 0 when wrong, otherwise
  -- 8 / 12 / 18 by difficulty.
  insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer, response_time_ms, answered_on)
  values (auth.uid(), '2f000000-0000-4000-8000-000000000001', v_session, 'A', 1200, current_date - 1)
  returning * into v_attempt;
  assert v_attempt.is_correct = true, 'correct answer detected server-side';
  assert v_attempt.xp_earned = public.xp_for_answer(true, 'easy'),
    format('easy correct answer pays xp_for_answer(easy), got %s', v_attempt.xp_earned);
  assert v_attempt.xp_earned = 8, format('xp_for_answer(easy) is 8, got %s', v_attempt.xp_earned);

  insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer, answered_on)
  values (auth.uid(), '2f000000-0000-4000-8000-000000000002', v_session, 'A', current_date)
  returning * into v_attempt;
  assert v_attempt.is_correct = false, 'wrong answer detected';
  assert v_attempt.xp_earned = 0, format('a wrong answer pays nothing, got %s', v_attempt.xp_earned);

  select * into v_progress from public.user_progress where user_id = auth.uid();
  assert v_progress.total_xp = 8, format('8 xp expected, got %s', v_progress.total_xp);
  assert v_progress.total_questions_answered = 2;
  assert v_progress.total_correct_answers = 1;
  assert v_progress.current_streak = 2, format('streak extended to 2 (yesterday + today), got %s', v_progress.current_streak);
  assert v_progress.longest_streak = 2;
  assert v_progress.last_active_date = current_date;

  -- duplicates are rejected (idempotent offline retries)
  begin
    insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer)
    values (auth.uid(), '2f000000-0000-4000-8000-000000000002', v_session, 'B');
  exception when unique_violation then v_blocked := true;
  end;
  assert v_blocked, 'duplicate attempt per session rejected';

  -- attempts for other users are rejected
  v_blocked := false;
  begin
    insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer)
    values ('aaaaaaaa-0000-4000-8000-000000000003', '2f000000-0000-4000-8000-000000000003', v_session, 'B');
  exception when insufficient_privilege then v_blocked := true;
  end;
  assert v_blocked, 'attempt for other user rejected';

  v_result := public.complete_quiz_session(v_session);
  assert (v_result -> 'session' ->> 'completed_at') is not null, 'session completed';
  -- 8 from the correct answer, no completion bonus (xp_for_session_completion() is 0).
  assert (v_result -> 'session' ->> 'xp_earned')::int = 8 + public.xp_for_session_completion(),
    format('session xp is the answers plus the bonus, got %s', v_result -> 'session' ->> 'xp_earned');
  assert (v_result -> 'session' ->> 'xp_earned')::int = 8,
    format('8 expected, got %s', v_result -> 'session' ->> 'xp_earned');
  assert (v_result -> 'session' ->> 'correct_answers')::int = 1;
  assert (v_result -> 'progress' ->> 'total_xp')::int = 8;
  assert (v_result -> 'progress' ->> 'total_sessions_completed')::int = 1;

  -- completing twice is idempotent
  v_result := public.complete_quiz_session(v_session);
  assert (v_result -> 'progress' ->> 'total_xp')::int = 8, 'no double bonus';

  -- no attempts after completion
  v_blocked := false;
  begin
    insert into public.quiz_attempts (user_id, question_id, quiz_session_id, selected_answer)
    values (auth.uid(), '2f000000-0000-4000-8000-000000000003', v_session, 'B');
  exception when check_violation then v_blocked := true;
  end;
  assert v_blocked, 'no attempts on completed sessions';

  select count(*) into v_count from public.get_my_category_stats();
  assert v_count = 1, 'category stats for one category';
  select count(*) into v_count from public.get_my_topic_stats() where kind = 'tag';
  assert v_count = 2, format('tag stats (smoke, smoke-easy), got %s', v_count);
end $$;

-- 6. Other users cannot see these rows ----------------------------------------------------------------------
select public.__reset_role();
select public.__impersonate('aaaaaaaa-0000-4000-8000-000000000003');
do $$
declare v_count int;
begin
  select count(*) into v_count from public.quiz_attempts;
  assert v_count = 0, 'attempts are private';
  select count(*) into v_count from public.quiz_sessions;
  assert v_count = 0, 'sessions are private';
  select count(*) into v_count from public.user_progress;
  assert v_count = 1, 'only own progress visible';
  assert (select total_xp from public.user_progress) = 0;
end $$;

-- 7. Admin abilities -------------------------------------------------------------------------------------------
select public.__reset_role();
select public.__impersonate('aaaaaaaa-0000-4000-8000-000000000002');
do $$
declare v_stats jsonb; v_rows int; v_blocked boolean := false; v_id uuid;
begin
  assert public.is_admin(), 'admin detected';
  v_stats := public.get_admin_dashboard_stats();
  assert (v_stats ->> 'questions_published')::int
    = (select count(*) from public.questions where status = 'published'),
    'dashboard counts the published questions';
  assert (v_stats ->> 'categories_total')::int = (select count(*) from public.categories),
    'dashboard counts every category';

  -- The user answered this one above, so section 8 can check that an archived
  -- question disappears from the catalogue but stays in the history.
  update public.questions set status = 'archived' where id = '2f000000-0000-4000-8000-000000000002';
  get diagnostics v_rows = row_count;
  assert v_rows = 1, 'admin can update questions';

  insert into public.categories (slug, name, is_active) values ('cloud', 'Cloud', false) returning id into v_id;
  assert v_id is not null, 'admin can insert categories';

  -- publishing incomplete questions is rejected
  begin
    insert into public.questions (category_id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, explanation, status)
    values (v_id, 'Unvollständig', 'a', 'b', 'c', 'd', 'A', '', 'published');
  exception when check_violation then v_blocked := true;
  end;
  assert v_blocked, 'publish validation enforced';

  -- drafts may be incomplete
  insert into public.questions (category_id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, status)
  values (v_id, 'Entwurf', 'a', 'b', 'c', 'd', 'A', 'draft');

  select count(*) into v_rows from public.questions where status <> 'published';
  assert v_rows = 2, 'admin sees drafts and archived';
end $$;

-- 8. Regular user does not see the inactive category or archived question --------------------------------------
select public.__reset_role();
select public.__impersonate('aaaaaaaa-0000-4000-8000-000000000001');
do $$
declare v_count int;
begin
  select count(*) into v_count from public.categories where slug = 'cloud';
  assert v_count = 0, 'inactive category hidden';
  select count(*) into v_count from public.questions where id = '2f000000-0000-4000-8000-000000000002';
  assert v_count = 0, 'archived question hidden';
  -- history still counts archived questions
  select count(*) into v_count from public.get_my_category_stats();
  assert v_count = 1;
  perform public.reset_my_progress();
  assert (select total_xp from public.user_progress where user_id = auth.uid()) = 0, 'progress reset';
  select count(*) into v_count from public.quiz_attempts;
  assert v_count = 0, 'attempts removed on reset';
end $$;

-- 9. Anonymous → account upgrade keeps profile in sync ---------------------------------------------------------------
select public.__reset_role();
update auth.users set is_anonymous = false, email = 'ronald@example.com' where id = 'aaaaaaaa-0000-4000-8000-000000000001';
do $$
begin
  assert (select is_anonymous from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001') = false, 'is_anonymous synced';
end $$;

drop function public.__impersonate(uuid, text);
drop function public.__reset_role();
select 'SMOKE TESTS PASSED' as result;
