import type { AnswerKey, AttemptResult, QuizMode, SessionType, UserProgress } from '@quizbyte/shared';
import type { CompletedQuizSession } from '@/state/quizSessionStore';
import type { Tables } from '@quizbyte/database';

import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import { fetchCategories } from './categoriesApi';
import { toUserProgress } from './mappers';
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

export interface CreateSessionInput {
  userId: string;
  categoryId: string | null;
  sessionType: SessionType;
  /** How the round is played; the server stores it with the session. */
  mode: QuizMode;
  totalQuestions: number;
}

export async function createQuizSession(input: CreateSessionInput): Promise<string> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: input.userId,
      category_id: input.categoryId,
      session_type: input.sessionType,
      mode: input.mode,
      total_questions: input.totalQuestions,
    })
    .select('id')
    .single();
  if (error) throw toAppError(error, 'Das Quiz konnte nicht gestartet werden. Bitte versuche es erneut.');
  return data.id;
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

/**
 * Stores one answered question. The server decides `is_correct` and `xp_earned`;
 * the returned values are authoritative.
 */
export async function submitAttempt(input: SubmitAttemptInput): Promise<AttemptResult> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: input.userId,
      quiz_session_id: input.sessionId,
      question_id: input.questionId,
      selected_answer: input.selectedAnswer,
      response_time_ms: Math.max(0, Math.round(input.responseTimeMs)),
      answered_on: input.answeredOn,
    })
    .select('question_id, selected_answer, is_correct, response_time_ms, xp_earned')
    .single();
  if (error) throw toAppError(error);
  return {
    questionId: data.question_id,
    selectedAnswer: data.selected_answer,
    isCorrect: data.is_correct,
    responseTimeMs: data.response_time_ms,
    xpEarned: data.xp_earned,
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
    pool: [],
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
