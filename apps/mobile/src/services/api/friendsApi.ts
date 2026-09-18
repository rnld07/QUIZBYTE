import { computeLevelProgress, normalizeAvatarConfig, quizModeById } from '@quizbyte/shared';
import type { AnswerKey, AvatarConfig, QuizMode, QuizQuestion } from '@quizbyte/shared';

import type { ModeRecord } from '@/services/api/progressApi';
import { AppError, toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import type { CategoryLookup } from './mappers';
import { toQuizQuestion } from './mappers';

/** How I stand towards a user found in the search. */
export type FriendStatus = 'none' | 'requested' | 'incoming' | 'friends';

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarConfig: AvatarConfig;
  selectedFrame: string | null;
  status: FriendStatus;
}

export interface Friend {
  id: string;
  username: string;
  displayName: string | null;
  avatarConfig: AvatarConfig;
  /** Equipped profile frame; null when none is worn. */
  selectedFrame: string | null;
  totalXp: number;
  /** Derived from the XP – the database never stores a level. */
  level: number;
}

export interface FriendRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarConfig: AvatarConfig;
  selectedFrame: string | null;
  createdAt: number;
}

export interface FriendProfile extends Friend {
  currentStreak: number;
  longestStreak: number;
  questionsAnswered: number;
  correctAnswers: number;
  sessionsCompleted: number;
  /** Rounds finished without a single mistake. */
  perfectSessions: number;
}

export type DuelStatus = 'pending' | 'active' | 'finished' | 'declined';

export interface DuelSummary {
  status: DuelStatus;
  /** Both sides play the same mode – it was chosen with the challenge. */
  mode: QuizMode;
  challengerId: string;
  opponentId: string;
  challengerCorrect: number | null;
  opponentCorrect: number | null;
  /**
   * Whether that side has played its round.
   *
   * Separate from the score, which only arrives once *both* are done – in
   * between, a player who had finished still looked like they had not started.
   */
  challengerPlayed: boolean;
  opponentPlayed: boolean;
  /**
   * My own running score, counted from my own session.
   *
   * The server only ever counts the caller's side, so a duel can show me how
   * I did while the other one is still playing without telling either of us
   * what the other has scored.
   */
  myCorrect: number | null;
  winnerId: string | null;
}

export interface SharedAnswer {
  selectedAnswer: AnswerKey;
  isCorrect: boolean;
  answeredAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  kind: 'question' | 'duel';
  questionId: string | null;
  duelId: string | null;
  createdAt: number;
  /** How the recipient answered a shared question, once they did. */
  answer: SharedAnswer | null;
  duel: DuelSummary | null;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const { data, error } = await supabase.rpc('search_users', { p_query: query });
  if (error) throw toAppError(error, 'Die Suche hat nicht geklappt. Bitte versuche es erneut.');
  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarConfig: normalizeAvatarConfig(row.avatar_config),
    selectedFrame: row.selected_frame,
    status: row.friend_status as FriendStatus,
  }));
}

export async function sendFriendRequest(userId: string): Promise<void> {
  const { error } = await supabase.rpc('send_friend_request', { p_user_id: userId });
  if (error) throw toAppError(error, 'Die Anfrage konnte nicht gesendet werden.');
}

export async function respondFriendRequest(friendshipId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_friend_request', { p_friendship_id: friendshipId, p_accept: accept });
  if (error) throw toAppError(error, 'Die Anfrage konnte nicht beantwortet werden.');
}

export async function removeFriend(userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_friend', { p_user_id: userId });
  if (error) throw toAppError(error, 'Die Freundschaft konnte nicht beendet werden.');
}

export async function fetchFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('get_my_friends');
  if (error) throw toAppError(error, 'Deine Freunde konnten nicht geladen werden.');
  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarConfig: normalizeAvatarConfig(row.avatar_config),
    selectedFrame: row.selected_frame,
    totalXp: row.total_xp,
    level: computeLevelProgress(row.total_xp).level,
  }));
}

export async function fetchFriendRequests(): Promise<FriendRequest[]> {
  const { data, error } = await supabase.rpc('get_friend_requests');
  if (error) throw toAppError(error, 'Die Anfragen konnten nicht geladen werden.');
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarConfig: normalizeAvatarConfig(row.avatar_config),
    selectedFrame: row.selected_frame,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function fetchFriendProfile(userId: string): Promise<FriendProfile | null> {
  const { data, error } = await supabase.rpc('get_friend_profile', { p_user_id: userId });
  if (error) throw toAppError(error, 'Das Profil konnte nicht geladen werden.');
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: (row.display_name as string | null) ?? null,
    avatarConfig: normalizeAvatarConfig(row.avatar_config),
    selectedFrame: (row.selected_frame as string | null) ?? null,
    totalXp: Number(row.total_xp ?? 0),
    level: computeLevelProgress(Number(row.total_xp ?? 0)).level,
    currentStreak: Number(row.current_streak ?? 0),
    longestStreak: Number(row.longest_streak ?? 0),
    questionsAnswered: Number(row.questions_answered ?? 0),
    correctAnswers: Number(row.correct_answers ?? 0),
    sessionsCompleted: Number(row.sessions_completed ?? 0),
    perfectSessions: Number(row.perfect_sessions ?? 0),
  };
}

/**
 * A friend's personal bests per mode.
 *
 * The same shape as your own, so the profile can show them with the same
 * component. The server only answers for someone you are actually friends with.
 */
export async function fetchFriendModeRecords(userId: string): Promise<Record<string, ModeRecord>> {
  const { data, error } = await supabase.rpc('get_friend_mode_records', { p_user_id: userId });
  if (error) throw toAppError(error, 'Die Bestwerte konnten nicht geladen werden.');

  const records: Record<string, ModeRecord> = {};
  for (const row of data ?? []) {
    records[row.mode] = {
      rounds: row.rounds,
      bestCorrect: row.best_correct,
      bestAnswered: row.best_answered,
      perfectRounds: row.perfect_rounds,
    };
  }
  return records;
}

/**
 * One duel, for the result screen of a round that was just played.
 *
 * The same shape and the same rules as the duels that arrive with a chat: my
 * own score as soon as I have played, theirs only once it is settled.
 */
export async function fetchDuel(duelId: string): Promise<DuelSummary | null> {
  const { data, error } = await supabase.rpc('get_duel', { p_duel_id: duelId });
  if (error) throw toAppError(error, 'Das Duell konnte nicht geladen werden.');
  if (!data) return null;

  const duel = data as {
    status: DuelStatus;
    mode: QuizMode | null;
    challenger_id: string;
    opponent_id: string;
    challenger_correct: number | null;
    opponent_correct: number | null;
    challenger_played?: boolean;
    opponent_played?: boolean;
    my_correct?: number | null;
    winner_id: string | null;
  };

  return {
    status: duel.status,
    mode: quizModeById(duel.mode).id,
    challengerId: duel.challenger_id,
    opponentId: duel.opponent_id,
    challengerCorrect: duel.challenger_correct,
    opponentCorrect: duel.opponent_correct,
    challengerPlayed: duel.challenger_played ?? duel.challenger_correct !== null,
    opponentPlayed: duel.opponent_played ?? duel.opponent_correct !== null,
    myCorrect: duel.my_correct ?? null,
    winnerId: duel.winner_id,
  };
}

/** How many duels I have finished, against anyone. */
export async function fetchMyDuelCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_my_duels');
  if (error) throw toAppError(error, 'Die Duelle konnten nicht geladen werden.');
  return Number(data ?? 0);
}

export interface DuelRecord {
  /** Finished duels between the two of you. */
  played: number;
  won: number;
  drawn: number;
  lost: number;
}

/** How the two of you stand. Finished duels only – a running one is no result. */
export async function fetchDuelRecord(userId: string): Promise<DuelRecord> {
  const { data, error } = await supabase.rpc('get_duel_record', { p_user_id: userId });
  if (error) throw toAppError(error, 'Die Bilanz konnte nicht geladen werden.');
  const row = data?.[0];
  return {
    played: Number(row?.played ?? 0),
    won: Number(row?.won ?? 0),
    drawn: Number(row?.drawn ?? 0),
    lost: Number(row?.lost ?? 0),
  };
}

export async function fetchConversation(friendId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('get_conversation', { p_friend_id: friendId });
  if (error) throw toAppError(error, 'Der Chat konnte nicht geladen werden.');
  return (data ?? []).map((row) => {
    const answer = row.answer as { selected_answer: AnswerKey; is_correct: boolean; answered_at: string } | null;
    const duel = row.duel as {
      status: DuelStatus;
      mode: QuizMode | null;
      challenger_id: string;
      opponent_id: string;
      challenger_correct: number | null;
      opponent_correct: number | null;
      challenger_played?: boolean;
      opponent_played?: boolean;
      my_correct?: number | null;
      winner_id: string | null;
    } | null;
    return {
      id: row.id,
      senderId: row.sender_id,
      kind: row.kind,
      questionId: row.question_id,
      duelId: row.duel_id,
      createdAt: new Date(row.created_at).getTime(),
      answer: answer
        ? { selectedAnswer: answer.selected_answer, isCorrect: answer.is_correct, answeredAt: new Date(answer.answered_at).getTime() }
        : null,
      duel: duel
        ? {
            status: duel.status,
            // Duels from before the modes shipped have none stored; they were
            // classic rounds, and that is exactly what the fallback returns.
            mode: quizModeById(duel.mode).id,
            challengerId: duel.challenger_id,
            opponentId: duel.opponent_id,
            challengerCorrect: duel.challenger_correct,
            opponentCorrect: duel.opponent_correct,
            // Older rows come back without the flags; a finished score is
            // proof enough that the round was played.
            challengerPlayed: duel.challenger_played ?? duel.challenger_correct !== null,
            opponentPlayed: duel.opponent_played ?? duel.opponent_correct !== null,
            myCorrect: duel.my_correct ?? null,
            winnerId: duel.winner_id,
          }
        : null,
    };
  });
}

/**
 * How much is unread, per friend.
 *
 * Only chats with something new come back – a map is easier to read against
 * than a list with a lot of zeroes in it.
 */
export async function fetchUnreadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_unread_counts');
  if (error) throw toAppError(error, 'Die Nachrichten konnten nicht geladen werden.');
  return Object.fromEntries((data ?? []).map((row) => [row.friend_id, Number(row.unread)]));
}

/** Marks the chat with this friend as read up to now. */
export async function markConversationRead(friendId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_friend_id: friendId });
  if (error) throw toAppError(error);
}

export async function sendQuestionToFriend(friendId: string, questionId: string): Promise<void> {
  const { error } = await supabase.rpc('send_question_to_friend', { p_friend_id: friendId, p_question_id: questionId });
  if (error) throw toAppError(error, 'Die Frage konnte nicht gesendet werden.');
}

/** Answers a shared question. Returns whether it was right. */
export async function answerSharedQuestion(messageId: string, answer: AnswerKey): Promise<boolean> {
  const { data, error } = await supabase.rpc('answer_shared_question', { p_message_id: messageId, p_answer: answer });
  if (error) throw toAppError(error, 'Deine Antwort konnte nicht gespeichert werden.');
  return data === true;
}

export async function createDuel(friendId: string, mode: QuizMode): Promise<string> {
  const { data, error } = await supabase.rpc('create_duel', { p_friend_id: friendId, p_mode: mode });
  if (error) {
    // Die App zeigt den Knopf gar nicht erst an, wenn eines aussteht – hierher
    // kommt man nur, wenn sich beide im selben Moment herausgefordert haben.
    // "Dieser Wert ist bereits vergeben", was 23505 sonst bedeutet, wäre dafür
    // die falsche Auskunft.
    if (error.message.includes('duel already open')) {
      throw new AppError('conflict', 'Mit dieser Person läuft schon ein Duell. Spielt das erst zu Ende.', error);
    }
    throw toAppError(error, 'Das Duell konnte nicht gestartet werden.');
  }
  return data as string;
}

/**
 * Lehnt eine Herausforderung ab.
 *
 * Die Funktion gibt zurück, ob es überhaupt zutraf – vorher war ein Ablehnen,
 * das auf nichts passte, ein `update` über null Zeilen und damit aus Sicht der
 * App ein Erfolg. Genau deshalb sah es aus, als passiere beim Kreuz nichts.
 */
export async function declineDuel(duelId: string): Promise<void> {
  const { data, error } = await supabase.rpc('decline_duel', { p_duel_id: duelId });
  if (error) throw toAppError(error, 'Das Duell konnte nicht abgelehnt werden.');
  if (data !== true) {
    throw new AppError('conflict', 'Dieses Duell lässt sich nicht mehr ablehnen.');
  }
}

export async function fetchDuelQuestions(duelId: string, categories: CategoryLookup): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_duel_questions', { p_duel_id: duelId });
  if (error) throw toAppError(error, 'Die Fragen konnten gerade nicht geladen werden.');
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}

/** Binds a freshly created quiz session to my side of the duel. */
export async function joinDuel(duelId: string, sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('join_duel', { p_duel_id: duelId, p_session_id: sessionId });
  if (error) throw toAppError(error, 'Das Duell konnte nicht gestartet werden.');
}

/** Asks the server to score the duel – it does nothing until both have played. */
export async function settleDuel(duelId: string): Promise<void> {
  const { error } = await supabase.rpc('settle_duel', { p_duel_id: duelId });
  // Scoring is idempotent and runs again on the next open; never fail a round over it.
  if (error) return;
}
