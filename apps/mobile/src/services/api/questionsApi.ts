import type { QuizQuestion, TrainingFocus } from '@quizbyte/shared';
import type { Enums } from '@quizbyte/database';

import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import type { CategoryLookup } from './mappers';
import { toQuizQuestion } from './mappers';

const LOAD_ERROR = 'Die Fragen konnten gerade nicht geladen werden. Bitte versuche es erneut.';

/** Random published questions, optionally limited to one category. */
export async function fetchSessionQuestions(
  categoryId: string | null,
  limit: number,
  categories: CategoryLookup,
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_session_questions', {
    p_category_id: categoryId,
    p_limit: limit,
  });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}

/** Published questions from the user's weak topics. */
export async function fetchTrainingQuestions(
  focus: TrainingFocus,
  limit: number,
  categories: CategoryLookup,
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_training_questions', {
    p_subcategories: focus.subcategories,
    p_tags: focus.tags,
    p_category_ids: focus.categoryIds,
    p_limit: limit,
  });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}

/** Published questions the user answered wrong and has not got right since. */
export async function fetchWrongQuestions(limit: number, categories: CategoryLookup): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_my_wrong_questions', { p_limit: limit });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}

/** How many wrongly answered questions are waiting to be replayed. */
export async function countWrongQuestions(): Promise<number> {
  const { data, error } = await supabase.rpc('count_my_wrong_questions');
  if (error) throw toAppError(error, LOAD_ERROR);
  return Number(data ?? 0);
}

/** Which of a category's answered questions to list. */
export type QuestionOutcomeFilter = 'all' | 'correct' | 'wrong';

/**
 * The questions behind a category's numbers, judged by the user's last attempt.
 * Powers the drill-down from the category detail sheet.
 */
export async function fetchCategoryQuestions(
  categoryId: string,
  filter: QuestionOutcomeFilter,
  categories: CategoryLookup,
): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_my_category_questions', {
    p_category_id: categoryId,
    p_filter: filter,
  });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}

/** The questions of one completed session, in the order they were answered. */
export async function fetchSessionQuestionsById(sessionId: string, categories: CategoryLookup): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_my_session_questions', { p_session_id: sessionId });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}

export interface AnswerHistory {
  /** Answered at least once – drives the "Neu" badge. */
  seen: string[];
  /** Answered correctly at least once – these no longer pay XP. */
  mastered: string[];
}

/**
 * What the user has already done with the given questions.
 *
 * Filtered by the user by hand, not left to row-level security: an admin's
 * policy lets them read *everyone's* attempts, so without this an admin account
 * sees every question anyone has ever answered as "schon beantwortet" – and,
 * worse, gets no XP for it, because the same list decides what has already been
 * mastered.
 */
export async function fetchAnswerHistory(userId: string, questionIds: string[]): Promise<AnswerHistory> {
  if (questionIds.length === 0) return { seen: [], mastered: [] };
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('question_id, is_correct')
    .eq('user_id', userId)
    .in('question_id', questionIds);
  // Not worth failing a quiz start over – the badge simply stays on "neu".
  if (error) return { seen: [], mastered: [] };

  const seen = new Set<string>();
  const mastered = new Set<string>();
  for (const row of data ?? []) {
    seen.add(row.question_id);
    if (row.is_correct) mastered.add(row.question_id);
  }
  return { seen: [...seen], mastered: [...mastered] };
}

/** The questions the user bookmarked, most recently saved first. */
export async function fetchSavedQuestions(limit: number, categories: CategoryLookup): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_my_saved_questions', { p_limit: limit });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}

/**
 * Ids of the saved questions among the given ones – drives the bookmark icon
 * in the quiz without loading the whole list.
 */
export async function fetchSavedQuestionIds(questionIds: string[]): Promise<string[]> {
  if (questionIds.length === 0) return [];
  const { data, error } = await supabase.from('saved_questions').select('question_id').in('question_id', questionIds);
  // Not worth failing a quiz over – the icon simply starts unfilled.
  if (error) return [];
  return (data ?? []).map((row) => row.question_id);
}

/** Bookmarks a question. Saving twice is a no-op, not an error. */
export async function saveQuestion(userId: string, questionId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_questions')
    .upsert({ user_id: userId, question_id: questionId }, { onConflict: 'user_id,question_id' });
  if (error) throw toAppError(error, 'Die Frage konnte nicht gespeichert werden.');
}

/** Removes a question from "Gespeichert". */
export async function unsaveQuestion(userId: string, questionId: string): Promise<void> {
  const { error } = await supabase.from('saved_questions').delete().eq('user_id', userId).eq('question_id', questionId);
  if (error) throw toAppError(error, 'Die Frage konnte nicht entfernt werden.');
}

/** Why a question was reported – mirrors the `report_reason` enum. */
export type ReportReason = Enums<'report_reason'>;

export interface ReportQuestionInput {
  userId: string;
  questionId: string;
  reason: ReportReason;
  /** Free text from the user; may be empty when the reason speaks for itself. */
  details: string;
}

/** Files a report for one question. Reports are private to their author. */
export async function reportQuestion(input: ReportQuestionInput): Promise<void> {
  const { error } = await supabase.from('question_reports').insert({
    user_id: input.userId,
    question_id: input.questionId,
    reason: input.reason,
    details: input.details.trim().slice(0, 1000),
  });
  if (error) throw toAppError(error, 'Die Meldung konnte nicht gesendet werden. Bitte versuche es erneut.');
}

/**
 * Specific questions by id – used by the friend chat to render shared ones.
 *
 * Through an RPC rather than off the table: the server hands out the solution
 * only for questions the user has already answered. Before that, the answer
 * would be sitting in the payload of the very screen that asks for it.
 */
export async function fetchQuestionsByIds(questionIds: string[], categories: CategoryLookup): Promise<QuizQuestion[]> {
  if (questionIds.length === 0) return [];
  const { data, error } = await supabase.rpc('get_questions_for_chat', { p_question_ids: questionIds });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => toQuizQuestion(row, categories));
}
