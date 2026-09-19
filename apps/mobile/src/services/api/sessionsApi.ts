import type {
  AnswerKey,
  AttemptResult,
  Difficulty,
  QuizMode,
  QuizQuestion,
  SessionType,
  TrainingFocus,
  UserProgress,
} from '@quizbyte/shared';
import type { CompletedQuizSession } from '@/state/quizSessionStore';
import type { Tables } from '@quizbyte/database';

import { AppError, toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import { fetchCategories } from './categoriesApi';
import type { CategoryLookup, QuestionRow } from './mappers';
import { toQuizQuestion, toUserProgress } from './mappers';
import { fetchProgress } from './progressApi';
import { fetchSessionQuestionsById } from './questionsApi';

const RESTORE_ERROR = 'Das Ergebnis konnte nicht geladen werden.';

/** Fallback names for rounds that belong to no category. */
const SESSION_TYPE_NAMES: Record<SessionType, string> = {
  category: 'Quiz',
  random: 'Random',
  weakness: 'Schwächen trainieren',
  daily: 'Daily Quiz',
  duel: 'Duell',
  exam: 'Prüfung',
};

/** What a server-started round hands back: the round and the questions it consists of. */
export interface StartedRound {
  sessionId: string;
  questions: QuizQuestion[];
}

interface RoundPayload {
  session_id: string;
  questions: QuestionRow[];
}

function toStartedRound(payload: unknown, categories: CategoryLookup): StartedRound {
  const round = payload as RoundPayload | null;
  if (!round?.session_id) {
    throw new AppError('unknown', 'Die Runde konnte nicht gestartet werden. Bitte versuche es erneut.');
  }
  return {
    sessionId: round.session_id,
    questions: (round.questions ?? []).map((row) => toQuizQuestion(row, categories)),
  };
}

/**
 * Starts today's daily round on the server.
 *
 * The questions come back with the round, and the server keeps the list: an
 * answer to anything else is refused from here on. That is the whole point -
 * before this, the round was whatever the client said it was.
 */
export async function startDailyRound(categories: CategoryLookup): Promise<StartedRound> {
  const { data, error } = await supabase.rpc('start_daily_round');
  if (error) throw toAppError(error, 'Das Daily Quiz konnte nicht gestartet werden. Bitte versuche es erneut.');
  return toStartedRound(data, categories);
}

/**
 * Starts the caller's side of a duel.
 *
 * Binds the round to the duel in the same breath, so there is no window in
 * which a round exists that belongs to nobody. The questions arrive **without**
 * the solution: in a duel the verdict comes from the server once the answer is
 * in.
 */
export async function startDuelRound(duelId: string, categories: CategoryLookup): Promise<StartedRound> {
  const { data, error } = await supabase.rpc('start_duel_round', { p_duel_id: duelId });
  if (error) throw toAppError(error, 'Das Duell konnte nicht gestartet werden. Bitte versuche es erneut.');
  return toStartedRound(data, categories);
}

/** What the client may ask for when the server draws the round. */
export interface StartRoundRequest {
  /** 'weakness' covers training, the mistake replay and every other replay. */
  type: Extract<SessionType, 'category' | 'random' | 'weakness'>;
  mode: QuizMode;
  count: number;
  categoryId?: string | null;
  /** Empty means "all" – the same neutral state the setting has. */
  difficulties?: readonly Difficulty[];
  onlyNew?: boolean;
  /** Weak topics, for training rounds. */
  focus?: TrainingFocus;
  /**
   * An explicit set, for replays. The server takes only what the user has
   * answered or saved before - otherwise this would be the comfortable way to
   * ask for the solution of any question by id.
   */
  questionIds?: string[];
}

/**
 * Starts a category, random, weakness or replay round on the server.
 *
 * The wish stays with the client, the decision moves to the server: it applies
 * the difficulty filter, the "only new questions" preference and the share of
 * weak-topic questions itself, and writes down what it drew. An answer to
 * anything outside that set is refused from here on.
 */
export async function startQuizRound(request: StartRoundRequest, categories: CategoryLookup): Promise<StartedRound> {
  const { data, error } = await supabase.rpc('start_quiz_round', {
    p_type: request.type,
    p_mode: request.mode,
    p_count: request.count,
    p_category_id: request.categoryId ?? null,
    p_difficulties: request.difficulties && request.difficulties.length > 0 ? [...request.difficulties] : null,
    p_only_new: request.onlyNew ?? false,
    p_subcategories: request.focus?.subcategories ?? [],
    p_tags: request.focus?.tags ?? [],
    p_category_ids: request.focus?.categoryIds ?? [],
    p_question_ids: request.questionIds ?? null,
  });
  if (error) throw toAppError(error, 'Das Quiz konnte nicht gestartet werden. Bitte versuche es erneut.');
  return toStartedRound(data, categories);
}

/**
 * Re-draws the unanswered part of a running round for new difficulties.
 *
 * Server-side, because the round's question set is: answered questions keep
 * their place, the rest is drawn again, and the set is rewritten in the same
 * breath. Returns the whole round, in order.
 */
export async function retuneQuizRound(sessionId: string, difficulties: readonly Difficulty[]): Promise<StartedRound> {
  const list = await fetchCategories();
  const lookup = new Map(list.map((entry) => [entry.id, entry]));
  const { data, error } = await supabase.rpc('retune_quiz_round', {
    p_session_id: sessionId,
    p_difficulties: difficulties.length > 0 ? [...difficulties] : null,
  });
  if (error) throw toAppError(error, 'Die Schwierigkeit konnte nicht umgestellt werden.');
  return toStartedRound(data, lookup);
}

export interface SubmitAttemptInput {
  userId: string;
  sessionId: string;
  questionId: string;
  selectedAnswer: AnswerKey;
  responseTimeMs: number;
  /** Local calendar date YYYY-MM-DD – drives the streak. */
  answeredOn: string;
}

/** An answer as the server recorded it, plus what it is now willing to reveal. */
export interface SubmittedAttempt extends AttemptResult {
  /**
   * The solution. In a solo round the app already knew it; in a duel this is
   * the first time it learns it, and only for the question just answered.
   */
  correctAnswer: AnswerKey | null;
  explanation: string;
}

interface AttemptPayload {
  question_id: string;
  selected_answer: AnswerKey;
  is_correct: boolean;
  response_time_ms: number;
  xp_earned: number;
  correct_answer: AnswerKey | null;
  explanation: string | null;
}

/**
 * Stores one answered question. The server decides `is_correct` and `xp_earned`;
 * the returned values are authoritative.
 *
 * An RPC rather than an insert, for two reasons. A duel question arrives
 * without its solution, so the answer has to bring it back - `returning` can
 * only hand out columns of the row it just wrote. And sending the same answer
 * twice now returns the first result instead of a unique violation, which is
 * what makes a retry from the offline queue harmless.
 */
export async function submitAttempt(input: SubmitAttemptInput): Promise<SubmittedAttempt> {
  const { data, error } = await supabase.rpc('submit_attempt', {
    p_session_id: input.sessionId,
    p_question_id: input.questionId,
    p_answer: input.selectedAnswer,
    p_response_time_ms: Math.max(0, Math.round(input.responseTimeMs)),
    p_answered_on: input.answeredOn,
  });
  if (error) throw toAppError(error);
  const attempt = data as AttemptPayload | null;
  if (!attempt?.question_id) throw new AppError('unknown', 'Die Antwort konnte nicht gespeichert werden.');
  return {
    questionId: attempt.question_id,
    selectedAnswer: attempt.selected_answer,
    isCorrect: attempt.is_correct,
    responseTimeMs: attempt.response_time_ms,
    xpEarned: attempt.xp_earned,
    correctAnswer: attempt.correct_answer ?? null,
    explanation: attempt.explanation ?? '',
  };
}

export interface CompleteSessionResult {
  session: Tables<'quiz_sessions'>;
  progress: UserProgress;
  completionBonusXp: number;
}

export async function completeQuizSession(sessionId: string): Promise<CompleteSessionResult> {
  const { data, error } = await supabase.rpc('complete_quiz_session', { p_session_id: sessionId });
  if (error) throw toAppError(error, 'Das Ergebnis konnte nicht gespeichert werden.');
  const payload = data as {
    session: Tables<'quiz_sessions'>;
    progress: Tables<'user_progress'>;
    completion_bonus_xp: number;
  };
  return {
    session: payload.session,
    progress: toUserProgress(payload.progress),
    completionBonusXp: payload.completion_bonus_xp,
  };
}


/** The id of today's finished daily round, or null when there is none. */
export async function fetchDailySessionToday(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_daily_session_today');
  if (error) throw toAppError(error, 'Der Tagesstatus konnte nicht geladen werden.');
  return data ?? null;
}

/**
 * True when an earlier daily round of the same Berlin day exists – exactly the
 * rule the server uses to pay out XP, so the result screen never claims a loss
 * for a repeat.
 */
export async function fetchIsRepeatedDaily(sessionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_repeated_daily', { p_session_id: sessionId });
  // A failed check must not block the round; the server decides the XP anyway.
  if (error) return false;
  return data === true;
}

/**
 * Rebuilds a finished round from the database so the result screen still works
 * after an app restart, when the in-memory session is gone.
 *
 * XP before/after cannot be reconstructed – later rounds have moved the total
 * since. Both are therefore set to the current total, which makes the level card
 * show today's real standing and never claims a level-up that already happened.
 */
export async function restoreCompletedSession(sessionId: string, userId: string): Promise<CompletedQuizSession | null> {
  const [sessionResult, attemptResult, categories] = await Promise.all([
    supabase.from('quiz_sessions').select('*').eq('id', sessionId).maybeSingle(),
    supabase
      .from('quiz_attempts')
      .select('question_id, selected_answer, is_correct, response_time_ms, xp_earned')
      .eq('quiz_session_id', sessionId)
      .order('created_at'),
    fetchCategories(),
  ]);

  if (sessionResult.error) throw toAppError(sessionResult.error, RESTORE_ERROR);
  if (attemptResult.error) throw toAppError(attemptResult.error, RESTORE_ERROR);
  const session = sessionResult.data;
  if (!session || !session.completed_at) return null;

  const lookup = new Map(categories.map((category) => [category.id, category]));
  const [questions, progress, repeatedDaily] = await Promise.all([
    fetchSessionQuestionsById(sessionId, lookup),
    fetchProgress(userId),
    session.session_type === 'daily' ? fetchIsRepeatedDaily(sessionId) : Promise.resolve(false),
  ]);

  const attempts: AttemptResult[] = (attemptResult.data ?? []).map((row) => ({
    questionId: row.question_id,
    selectedAnswer: row.selected_answer,
    isCorrect: row.is_correct,
    responseTimeMs: row.response_time_ms,
    xpEarned: row.xp_earned,
  }));

  const answerXp = attempts.reduce((sum, attempt) => sum + attempt.xpEarned, 0);
  const answeredIds = attempts.map((attempt) => attempt.questionId);

  return {
    sessionId: session.id,
    sessionType: session.session_type,
    mode: session.mode,
    categoryId: session.category_id,
    categoryName: (session.category_id ? lookup.get(session.category_id)?.name : null) ?? SESSION_TYPE_NAMES[session.session_type],
    questions,
    // A finished round is read-only: nothing can be re-drawn any more.
    retunable: false,
    attempts,
    currentIndex: Math.max(0, questions.length - 1),
    questionShownAt: Date.now(),
    // Only the round just played knows which chat it came from; one rebuilt
    // from the server is reached from a list, and goes back there.
    duelFriendId: null,
    duelId: null,
    // A finished round is read-only; nothing can be queued for a second look.
    repeatIndices: [],
    seenQuestionIds: answeredIds,
    masteredQuestionIds: attempts.filter((attempt) => attempt.isCorrect).map((attempt) => attempt.questionId),
    repeatedDaily,
    // A finished round has no clock left to run.
    deadlineAt: null,
    startTotalXp: progress.totalXp,
    totalXpAfter: progress.totalXp,
    completedAt: new Date(session.completed_at).getTime(),
    completionBonusXp: Math.max(0, session.xp_earned - answerXp),
  };
}

export interface DailyResultToday {
  sessionId: string;
  xpEarned: number;
  /** What that round could realistically have paid – already-mastered questions excluded. */
  maxXp: number;
  correct: number;
  answered: number;
}

/**
 * What today's paying daily round scored. A repeat shows this instead of its
 * own zeroes, so the bar still says what the day was worth.
 */
export async function fetchDailyResultToday(): Promise<DailyResultToday | null> {
  const { data, error } = await supabase.rpc('get_my_daily_result_today');
  // The bar falls back to the round's own numbers; no reason to fail the screen.
  if (error || !data) return null;
  const payload = data as { session_id: string; xp_earned: number; max_xp: number; answered: number; correct: number };
  return {
    sessionId: payload.session_id,
    xpEarned: payload.xp_earned ?? 0,
    maxXp: payload.max_xp ?? 0,
    correct: payload.correct ?? 0,
    answered: payload.answered ?? 0,
  };
}
