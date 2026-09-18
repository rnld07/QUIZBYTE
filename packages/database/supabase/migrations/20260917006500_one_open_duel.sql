-- =============================================================================
-- QuizByte – nur ein offenes Duell je Freundschaft
--
-- Bisher liess sich eine Herausforderung nach der anderen schicken. Im Chat
-- stapelten sich dann Duelle, die niemand mehr einzeln zuordnen konnte, und
-- der Gegner hatte drei Runden vor sich, bevor er die erste gespielt hatte.
--
-- Ein offenes Duell ist eines, das weder gespielt noch abgelaufen ist – also
-- 'pending' oder 'active' innerhalb der Frist. Wer wartet, wartet auf genau
-- eines; abgelaufene und beendete stehen dem naechsten nicht im Weg.
--
-- Die App prueft dasselbe schon, bevor der Knopf ueberhaupt aktiv wird. Hier
-- steht es trotzdem: zwei Leute koennen sich im selben Moment herausfordern,
-- und das entscheidet nur die Datenbank.
-- =============================================================================

/**
 * Das offene Duell zwischen zwei Leuten, falls es eines gibt.
 *
 * Richtungslos: ob ich herausgefordert habe oder er, aendert nichts daran,
 * dass zwischen uns eine Runde aussteht.
 */
create or replace function public.open_duel_with(p_friend_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.id
  from public.duels d
  where d.status in ('pending', 'active')
    and now() <= d.created_at + make_interval(days => public.duel_deadline_days())
    and ((d.challenger_id = auth.uid() and d.opponent_id = p_friend_id)
      or (d.challenger_id = p_friend_id and d.opponent_id = auth.uid()))
  order by d.created_at desc
  limit 1;
$$;

comment on function public.open_duel_with(uuid) is
  'The unfinished, unexpired duel between the caller and this friend, if any.';

grant execute on function public.open_duel_with(uuid) to authenticated;

/** Wie bisher, nur dass ein bereits offenes Duell die naechste Runde sperrt. */
create or replace function public.create_duel(p_friend_id uuid, p_mode public.quiz_mode default 'classic')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_questions uuid[];
  v_wanted integer := public.duel_question_count(p_mode);
  v_id uuid;
begin
  if not public.are_friends(p_friend_id, auth.uid()) then
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
  values (auth.uid(), p_friend_id, v_questions, p_mode)
  returning id into v_id;

  insert into public.friend_messages (sender_id, recipient_id, kind, duel_id)
  values (auth.uid(), p_friend_id, 'duel', v_id);

  return v_id;
end;
$$;

grant execute on function public.create_duel(uuid, public.quiz_mode) to authenticated;
