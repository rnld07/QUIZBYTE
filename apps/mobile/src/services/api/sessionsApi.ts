import type { AnswerKey, AttemptResult, SessionType, UserProgress } from '@quizbyte/shared';
import type { Tables } from '@quizbyte/database';

import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import { toUserProgress } from './mappers';

export interface CreateSessionInput {
  userId: string;
  categoryId: string | null;
  sessionType: SessionType;
  totalQuestions: number;
}

export async function createQuizSession(input: CreateSessionInput): Promise<string> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: input.userId,
      category_id: input.categoryId,
      session_type: input.sessionType,
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
