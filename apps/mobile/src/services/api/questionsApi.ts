import type { QuizQuestion, TrainingFocus } from '@quizbyte/shared';

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
