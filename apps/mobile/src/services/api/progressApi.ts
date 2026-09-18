import type { Difficulty, TopicStat, UserProgress } from '@quizbyte/shared';

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


export interface DifficultyStat {
  difficulty: Difficulty;
  attempts: number;
  correct: number;
}

/** Attempts and hits per difficulty level for the current user. */
export async function fetchDifficultyStats(): Promise<DifficultyStat[]> {
  const { data, error } = await supabase.rpc('get_my_difficulty_stats');
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => ({
    difficulty: row.difficulty,
    attempts: Number(row.attempts),
    correct: Number(row.correct),
  }));
}

/** Attempts and hits per difficulty level inside one category. */
export async function fetchCategoryDifficultyStats(categoryId: string): Promise<DifficultyStat[]> {
  const { data, error } = await supabase.rpc('get_my_category_difficulty_stats', { p_category_id: categoryId });
  if (error) throw toAppError(error, LOAD_ERROR);
  return (data ?? []).map((row) => ({
    difficulty: row.difficulty,
    attempts: Number(row.attempts),
    correct: Number(row.correct),
  }));
}

/** Completed rounds in which every question was answered correctly. */
export async function fetchPerfectSessions(): Promise<number> {
  const { data, error } = await supabase.rpc('count_my_perfect_sessions');
  if (error) throw toAppError(error, 'Deine Statistik konnte nicht geladen werden.');
  return Number(data ?? 0);
}

export interface ModeRecord {
  rounds: number;
  /** Most correct answers in a single round. */
  bestCorrect: number;
  /** Most questions answered in a single round – how far you got. */
  bestAnswered: number;
  /** Rounds that ran to the end with every answer right. */
  perfectRounds: number;
}

export const EMPTY_MODE_RECORD: ModeRecord = { rounds: 0, bestCorrect: 0, bestAnswered: 0, perfectRounds: 0 };

/**
 * Personal bests per mode.
 *
 * `excludeSessionId` leaves the round just played out of the comparison, so the
 * result screen can tell a new record from an equalled one.
 */
export async function fetchModeRecords(excludeSessionId?: string | null): Promise<Record<string, ModeRecord>> {
  const { data, error } = await supabase.rpc('get_my_mode_records', { p_exclude_session: excludeSessionId ?? null });
  if (error) throw toAppError(error, 'Deine Bestwerte konnten nicht geladen werden.');

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

export interface AnswerStats {
  /** Distinct questions answered – a repeat does not count again. */
  answered: number;
  /** How many of those were right on the first attempt. */
  correct: number;
}

/**
 * The headline numbers of the progress screen.
 *
 * Counted over first attempts only, like every other statistic: repeating a
 * question you already know says nothing about what you know.
 */
export async function fetchAnswerStats(): Promise<AnswerStats> {
  const { data, error } = await supabase.rpc('get_my_answer_stats');
  if (error) throw toAppError(error, LOAD_ERROR);
  const row = data?.[0];
  return { answered: Number(row?.answered ?? 0), correct: Number(row?.correct ?? 0) };
}
