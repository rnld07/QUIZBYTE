-- =============================================================================
-- QuizByte – Funktionen für Freunde, Chat und Duelle
--
-- Alles Schreibende läuft über diese Funktionen statt über direkte Inserts:
-- Nur so lässt sich erzwingen, dass man ausschließlich Freunden schreibt, dass
-- eine geteilte Frage genau einmal beantwortet wird und dass der Sieger eines
-- Duells vom Server bestimmt wird und nicht vom Client.
-- =============================================================================

-- Suche --------------------------------------------------------------------------------

/** Nutzersuche nach Benutzername, inklusive Status der Beziehung zu mir. */
create or replace function public.search_users(p_query text, p_limit integer default 20)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  friend_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(
      (
        select case
          when f.status = 'accepted' then 'friends'
          when f.status = 'pending' and f.requester_id = auth.uid() then 'requested'
          when f.status = 'pending' then 'incoming'
          else 'none'
        end
        from public.friendships f
        where (f.requester_id = auth.uid() and f.addressee_id = p.id)
           or (f.requester_id = p.id and f.addressee_id = auth.uid())
      ),
      'none'
    ) as friend_status
  from public.profiles p
  where p.id <> auth.uid()
    and length(trim(p_query)) >= 2
    and p.username ilike '%' || trim(p_query) || '%'
  order by p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.search_users(text, integer) to authenticated;

-- Freundschaften -----------------------------------------------------------------------

/** Schickt eine Anfrage – oder nimmt eine offene Gegenanfrage direkt an. */
create or replace function public.send_friend_request(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_existing public.friendships%rowtype;
  v_id uuid;
begin
  if v_me is null or p_user_id = v_me then
    raise exception 'invalid friend request' using errcode = 'check_violation';
  end if;

  select * into v_existing
  from public.friendships f
  where (f.requester_id = v_me and f.addressee_id = p_user_id)
     or (f.requester_id = p_user_id and f.addressee_id = v_me);

  if found then
    -- Er hat mich zuerst gefragt: die Anfrage gilt als angenommen.
    if v_existing.status = 'pending' and v_existing.addressee_id = v_me then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where id = v_existing.id;
    elsif v_existing.status = 'declined' then
      update public.friendships
      set status = 'pending', requester_id = v_me, addressee_id = p_user_id, responded_at = null, created_at = now()
      where id = v_existing.id;
    end if;
    return v_existing.id;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (v_me, p_user_id)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

/** Nimmt eine Anfrage an oder lehnt sie ab. Nur der Empfänger darf das. */
create or replace function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friendships
  set status = case when p_accept then 'accepted'::public.friend_status else 'declined'::public.friend_status end,
      responded_at = now()
  where id = p_friendship_id
    and addressee_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'friend request not found' using errcode = 'no_data_found';
  end if;
end;
$$;

grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

/** Beendet eine Freundschaft oder zieht die eigene Anfrage zurück. */
create or replace function public.remove_friend(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friendships f
  where (f.requester_id = auth.uid() and f.addressee_id = p_user_id)
     or (f.requester_id = p_user_id and f.addressee_id = auth.uid());
$$;

grant execute on function public.remove_friend(uuid) to authenticated;

/** Meine bestätigten Freunde. */
create or replace function public.get_my_friends()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  total_xp integer,
  friends_since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(up.total_xp, 0),
    f.responded_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join public.user_progress up on up.user_id = p.id
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by p.username;
$$;

grant execute on function public.get_my_friends() to authenticated;

/** Offene Anfragen an mich. */
create or replace function public.get_friend_requests()
returns table (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, p.id, p.username, p.display_name, p.avatar_url, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid() and f.status = 'pending'
  order by f.created_at desc;
$$;

grant execute on function public.get_friend_requests() to authenticated;

/** Öffentliches Profil eines Freundes. */
create or replace function public.get_friend_profile(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'total_xp', coalesce(up.total_xp, 0),
    'current_streak', coalesce(up.current_streak, 0),
    'longest_streak', coalesce(up.longest_streak, 0),
    'questions_answered', coalesce(up.total_questions_answered, 0),
    'correct_answers', coalesce(up.total_correct_answers, 0),
    'sessions_completed', coalesce(up.total_sessions_completed, 0)
  )
  from public.profiles p
  left join public.user_progress up on up.user_id = p.id
  where p.id = p_user_id and public.are_friends(p_user_id, auth.uid());
$$;

grant execute on function public.get_friend_profile(uuid) to authenticated;

-- Chat ---------------------------------------------------------------------------------

/** Der Verlauf mit einem Freund, älteste zuerst. */
create or replace function public.get_conversation(p_friend_id uuid, p_limit integer default 100)
returns table (
  id uuid,
  sender_id uuid,
  kind public.message_kind,
  question_id uuid,
  duel_id uuid,
  created_at timestamptz,
  answer jsonb,
  duel jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.sender_id,
    m.kind,
    m.question_id,
    m.duel_id,
    m.created_at,
    (
      select jsonb_build_object('selected_answer', a.selected_answer, 'is_correct', a.is_correct, 'answered_at', a.answered_at)
      from public.shared_question_answers a where a.message_id = m.id
    ),
    (
      select jsonb_build_object(
        'status', d.status,
        'challenger_id', d.challenger_id,
        'opponent_id', d.opponent_id,
        'challenger_correct', d.challenger_correct,
        'opponent_correct', d.opponent_correct,
        'winner_id', d.winner_id
      )
      from public.duels d where d.id = m.duel_id
    )
  from public.friend_messages m
  where public.are_friends(p_friend_id, auth.uid())
    and ((m.sender_id = auth.uid() and m.recipient_id = p_friend_id)
      or (m.sender_id = p_friend_id and m.recipient_id = auth.uid()))
  order by m.created_at
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

grant execute on function public.get_conversation(uuid, integer) to authenticated;

/** Schickt einem Freund eine Frage. */
create or replace function public.send_question_to_friend(p_friend_id uuid, p_question_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.are_friends(p_friend_id, auth.uid()) then
    raise exception 'not friends' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.questions q where q.id = p_question_id and q.status = 'published') then
    raise exception 'question is not available' using errcode = 'foreign_key_violation';
  end if;

  insert into public.friend_messages (sender_id, recipient_id, kind, question_id)
  values (auth.uid(), p_friend_id, 'question', p_question_id)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.send_question_to_friend(uuid, uuid) to authenticated;

/**
 * Beantwortet eine geteilte Frage.
 *
 * Bewusst ohne XP: Das ist ein Austausch unter Freunden, keine Quizrunde – sonst
 * ließe sich XP durch gegenseitiges Zuschicken beliebig erzeugen.
 */
create or replace function public.answer_shared_question(p_message_id uuid, p_answer public.answer_key)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.friend_messages%rowtype;
  v_correct public.answer_key;
  v_is_correct boolean;
begin
  select * into v_message from public.friend_messages where id = p_message_id;
  if not found or v_message.recipient_id <> auth.uid() or v_message.kind <> 'question' then
    raise exception 'message not found' using errcode = 'no_data_found';
  end if;

  select q.correct_answer into v_correct from public.questions q where q.id = v_message.question_id;
  v_is_correct := (p_answer = v_correct);

  insert into public.shared_question_answers (message_id, user_id, selected_answer, is_correct)
  values (p_message_id, auth.uid(), p_answer, v_is_correct)
  on conflict (message_id) do nothing;

  return v_is_correct;
end;
$$;

grant execute on function public.answer_shared_question(uuid, public.answer_key) to authenticated;

-- Duelle -------------------------------------------------------------------------------

/**
 * Bonus für den Sieger eines Duells.
 *
 * Steht hier und nicht bei den übrigen XP-Funktionen, damit `settle_duel` weiter
 * unten in derselben Migration darauf zugreifen kann.
 *
 * Gegenstück in `packages/shared/src/config/xp.ts`: DUEL_WIN_XP.
 */
create or replace function public.xp_for_duel_win()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 20;
$$;

grant execute on function public.xp_for_duel_win() to authenticated;

/** Fordert einen Freund heraus: fünf zufällige Fragen aus allen Kategorien. */
create or replace function public.create_duel(p_friend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_questions uuid[];
  v_id uuid;
begin
  if not public.are_friends(p_friend_id, auth.uid()) then
    raise exception 'not friends' using errcode = 'insufficient_privilege';
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
    order by random()
    limit 5
  ) q;

  if v_questions is null or array_length(v_questions, 1) < 5 then
    raise exception 'not enough questions for a duel' using errcode = 'no_data_found';
  end if;

  insert into public.duels (challenger_id, opponent_id, question_ids)
  values (auth.uid(), p_friend_id, v_questions)
  returning id into v_id;

  insert into public.friend_messages (sender_id, recipient_id, kind, duel_id)
  values (auth.uid(), p_friend_id, 'duel', v_id);

  return v_id;
end;
$$;

grant execute on function public.create_duel(uuid) to authenticated;

/** Die Fragen eines Duells, in ihrer festen Reihenfolge. */
create or replace function public.get_duel_questions(p_duel_id uuid)
returns setof public.questions
language sql
stable
security definer
set search_path = ''
as $$
  select q.*
  from public.duels d
  join unnest(d.question_ids) with ordinality as ids(id, position) on true
  join public.questions q on q.id = ids.id
  where d.id = p_duel_id
    and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())
  order by ids.position;
$$;

grant execute on function public.get_duel_questions(uuid) to authenticated;

/** Bindet eine frisch angelegte Quizrunde an meine Seite des Duells. */
create or replace function public.join_duel(p_duel_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duel public.duels%rowtype;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found then
    raise exception 'duel not found' using errcode = 'no_data_found';
  end if;

  if auth.uid() = v_duel.challenger_id then
    if v_duel.challenger_session_id is not null then
      raise exception 'already played' using errcode = 'check_violation';
    end if;
    update public.duels set challenger_session_id = p_session_id, status = 'active' where id = p_duel_id;
  elsif auth.uid() = v_duel.opponent_id then
    if v_duel.opponent_session_id is not null then
      raise exception 'already played' using errcode = 'check_violation';
    end if;
    update public.duels set opponent_session_id = p_session_id, status = 'active' where id = p_duel_id;
  else
    raise exception 'not a participant' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

grant execute on function public.join_duel(uuid, uuid) to authenticated;

/** Lehnt eine Duell-Einladung ab. Nur der Herausgeforderte darf das. */
create or replace function public.decline_duel(p_duel_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.duels
  set status = 'declined', finished_at = now()
  where id = p_duel_id and opponent_id = auth.uid() and status = 'pending';
$$;

grant execute on function public.decline_duel(uuid) to authenticated;

/**
 * Wertet ein Duell aus, sobald beide gespielt haben.
 *
 * Der Sieger wird hier bestimmt und bekommt seinen Bonus – der Client rechnet
 * nichts davon selbst. Bei Gleichstand gibt es keinen Sieger und keinen Bonus.
 */
create or replace function public.settle_duel(p_duel_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duel public.duels%rowtype;
  v_challenger integer;
  v_opponent integer;
  v_winner uuid;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found or v_duel.status = 'finished' then
    return;
  end if;
  if v_duel.challenger_session_id is null or v_duel.opponent_session_id is null then
    return;
  end if;

  select count(*) filter (where a.is_correct) into v_challenger
  from public.quiz_attempts a where a.quiz_session_id = v_duel.challenger_session_id;
  select count(*) filter (where a.is_correct) into v_opponent
  from public.quiz_attempts a where a.quiz_session_id = v_duel.opponent_session_id;

  if v_challenger > v_opponent then
    v_winner := v_duel.challenger_id;
  elsif v_opponent > v_challenger then
    v_winner := v_duel.opponent_id;
  end if;

  update public.duels
  set status = 'finished',
      challenger_correct = v_challenger,
      opponent_correct = v_opponent,
      winner_id = v_winner,
      finished_at = now()
  where id = p_duel_id;

  if v_winner is not null then
    update public.user_progress
    set total_xp = total_xp + public.xp_for_duel_win()
    where user_id = v_winner;
  end if;
end;
$$;

grant execute on function public.settle_duel(uuid) to authenticated;

/** Duelle, bei denen ich am Zug bin oder auf den anderen warte. */
create or replace function public.get_my_duels()
returns table (
  id uuid,
  challenger_id uuid,
  opponent_id uuid,
  status public.duel_status,
  my_session_id uuid,
  their_session_id uuid,
  challenger_correct integer,
  opponent_correct integer,
  winner_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.challenger_id,
    d.opponent_id,
    d.status,
    case when d.challenger_id = auth.uid() then d.challenger_session_id else d.opponent_session_id end,
    case when d.challenger_id = auth.uid() then d.opponent_session_id else d.challenger_session_id end,
    d.challenger_correct,
    d.opponent_correct,
    d.winner_id,
    d.created_at
  from public.duels d
  where d.challenger_id = auth.uid() or d.opponent_id = auth.uid()
  order by d.created_at desc;
$$;

grant execute on function public.get_my_duels() to authenticated;
