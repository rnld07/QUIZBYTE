-- =============================================================================
-- QuizByte – eine Sperre gilt ueberall
--
-- `is_suspended()` steht in den Regeln fuers Spielen: keine neuen Runden, keine
-- neuen Antworten. In den sozialen Funktionen steht sie nicht. Ein gesperrtes
-- Konto kann deshalb weiter Fragen verschicken und Duelle starten – also genau
-- das tun, wofuer es in aller Regel gesperrt wurde.
--
-- Beide Funktionen bekommen denselben Waechter wie alles andere. Die
-- Freundschaftspruefung `are_friends()` traegt seit der vorigen Migration die
-- Blockierung mit; eine zweite Pruefung darauf waere nur Wiederholung.
--
-- Was ein gesperrtes Konto weiterhin darf: lesen, eine laufende Runde
-- abschliessen, ein Duell ablehnen. Alles, was nichts Neues erzeugt.
-- =============================================================================

/** Schickt einem Freund eine Frage. */
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
  if not exists (select 1 from public.questions q where q.id = p_question_id and q.status = 'published') then
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


/**
 * Fordert einen Freund heraus – im gewaehlten Modus.
 *
 * Unveraendert bis auf den Waechter am Anfang: beide bekommen dieselben Fragen
 * in derselben Reihenfolge, und die Zahl haengt am Modus.
 */
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
