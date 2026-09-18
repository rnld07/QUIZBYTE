-- =============================================================================
-- QuizByte – Freunde, Chat und Duelle
--
-- Der Chat kann bewusst nur zweierlei: eine Frage schicken und ein Duell
-- schicken. Deshalb gibt es keine Textnachrichten – eine Nachricht ist
-- entweder eine geteilte Frage oder eine Duell-Einladung.
--
-- Duelle: fünf feste Fragen aus allen Kategorien, für beide dieselben. Antworten
-- zahlen das 1,5-Fache, der Sieger bekommt zusätzlich einen Bonus. Bei
-- Gleichstand gibt es keinen Sieger und keinen Bonus.
--
-- Sichtbarkeit: Freunde dürfen Profil und Fortschritt des anderen lesen,
-- niemand sonst. Alles andere bleibt bei den bestehenden Regeln.
-- =============================================================================

create type public.friend_status as enum ('pending', 'accepted', 'declined');
create type public.message_kind as enum ('question', 'duel');
create type public.duel_status as enum ('pending', 'active', 'finished', 'declined');

-- Freundschaften -----------------------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status public.friend_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

comment on table public.friendships is 'Freundschaftsanfragen und bestätigte Freundschaften.';

-- Eine Beziehung pro Paar, egal wer angefragt hat.
create unique index friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);
create index friendships_addressee_idx on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

create policy "friendships: users read own"
  on public.friendships for select
  to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create policy "friendships: users request"
  on public.friendships for insert
  to authenticated
  with check (requester_id = (select auth.uid()));

create policy "friendships: addressee responds"
  on public.friendships for update
  to authenticated
  using (addressee_id = (select auth.uid()))
  with check (addressee_id = (select auth.uid()));

create policy "friendships: users delete own"
  on public.friendships for delete
  to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

grant select, insert, update, delete on public.friendships to authenticated;

/** True when the two users are confirmed friends. */
create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = p_a and f.addressee_id = p_b)
        or (f.requester_id = p_b and f.addressee_id = p_a))
  );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Freunde dürfen Profil und Fortschritt des anderen sehen ------------------------------

create policy "profiles: friends read each other"
  on public.profiles for select
  to authenticated
  using (public.are_friends(id, (select auth.uid())));

create policy "user_progress: friends read each other"
  on public.user_progress for select
  to authenticated
  using (public.are_friends(user_id, (select auth.uid())));

-- Duelle -------------------------------------------------------------------------------

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid not null references auth.users (id) on delete cascade,
  status public.duel_status not null default 'pending',
  -- Dieselben fünf Fragen für beide, in derselben Reihenfolge.
  question_ids uuid[] not null,
  challenger_session_id uuid references public.quiz_sessions (id) on delete set null,
  opponent_session_id uuid references public.quiz_sessions (id) on delete set null,
  challenger_correct integer,
  opponent_correct integer,
  winner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint duels_no_self check (challenger_id <> opponent_id)
);

comment on table public.duels is 'Asynchrone Duelle: fünf feste Fragen, beide spielen dieselbe Runde.';

create index duels_challenger_idx on public.duels (challenger_id, created_at desc);
create index duels_opponent_idx on public.duels (opponent_id, created_at desc);

alter table public.duels enable row level security;

create policy "duels: participants read"
  on public.duels for select
  to authenticated
  using (challenger_id = (select auth.uid()) or opponent_id = (select auth.uid()));

grant select on public.duels to authenticated;

-- Nachrichten --------------------------------------------------------------------------

create table public.friend_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  kind public.message_kind not null,
  question_id uuid references public.questions (id) on delete cascade,
  duel_id uuid references public.duels (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friend_messages_no_self check (sender_id <> recipient_id),
  -- Genau eine Nutzlast, passend zur Art.
  constraint friend_messages_payload check (
    (kind = 'question' and question_id is not null and duel_id is null)
    or (kind = 'duel' and duel_id is not null and question_id is null)
  )
);

comment on table public.friend_messages is 'Chat zwischen Freunden: geteilte Fragen und Duell-Einladungen.';

create index friend_messages_pair_idx on public.friend_messages (
  least(sender_id, recipient_id),
  greatest(sender_id, recipient_id),
  created_at desc
);

alter table public.friend_messages enable row level security;

create policy "friend_messages: participants read"
  on public.friend_messages for select
  to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

grant select on public.friend_messages to authenticated;

-- Antwort auf eine geteilte Frage ------------------------------------------------------

create table public.shared_question_answers (
  message_id uuid primary key references public.friend_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  selected_answer public.answer_key not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

comment on table public.shared_question_answers is 'Wie der Empfänger eine geteilte Frage beantwortet hat – der Absender sieht es.';

alter table public.shared_question_answers enable row level security;

create policy "shared_question_answers: participants read"
  on public.shared_question_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.friend_messages m
      where m.id = message_id
        and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
    )
  );

grant select on public.shared_question_answers to authenticated;
