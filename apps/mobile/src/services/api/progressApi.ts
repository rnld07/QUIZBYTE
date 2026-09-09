import type { TopicStat, UserProgress } from '@quizbyte/shared';

import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import { toTopicStat, toUserProgress } from './mappers';

const LOAD_ERROR = 'Dein Fortschritt konnte gerade nicht geladen werden.';

export async function fetchProgress(userId: string): Promise<UserProgress> {
  const { data, error } = await supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw toAppError(error, LOAD_ERROR);
  if (!data) {
    // The row is created by a database trigger; fall back to an empty state on the rare race.
    return {
      totalXp: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalSessionsCompleted: 0,
    };
  }
  return toUserProgress(data);
}

export interface CategoryStat extends TopicStat {
  kind: 'category';
  slug: string;
}

export async function fetchCategoryStats(): Promise<CategoryStat[]> {
  const { data, error } = await supabase.rpc('get_my_category_stats');
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => ({
    kind: 'category' as const,
    key: row.category_id,
    label: row.category_name,
    slug: row.category_slug,
    attempts: Number(row.attempts),
    correct: Number(row.correct),
  }));
}

export async function fetchTopicStats(): Promise<TopicStat[]> {
  const { data, error } = await supabase.rpc('get_my_topic_stats');
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map(toTopicStat).filter((stat): stat is TopicStat => stat !== null);
}

export async function resetProgress(): Promise<void> {
  const { error } = await supabase.rpc('reset_my_progress');
  if (error) throw toAppError(error, 'Der Fortschritt konnte nicht zurückgesetzt werden.');
}
