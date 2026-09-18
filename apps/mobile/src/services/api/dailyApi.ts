import type { DailyTaskKey, DailyTaskProgress } from '@quizbyte/shared';

import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

/** Today's three tasks with their progress. */
export async function fetchDailyTasks(): Promise<DailyTaskProgress[]> {
  const { data, error } = await supabase.rpc('get_my_daily_tasks');
  if (error) throw toAppError(error, 'Die Tagesaufgaben konnten nicht geladen werden.');
  return (data ?? []).map((row) => ({
    key: row.task_key as DailyTaskKey,
    progress: Number(row.progress),
    target: Number(row.target),
    claimed: row.claimed,
  }));
}

/** Collects the XP of a finished task. Returns what was paid – 0 if it already had been. */
export async function claimDailyTask(key: DailyTaskKey): Promise<number> {
  const { data, error } = await supabase.rpc('claim_daily_task', { p_key: key });
  if (error) throw toAppError(error, 'Die Belohnung konnte nicht abgeholt werden.');
  return Number(data ?? 0);
}

export interface DailyWheelState {
  /** Today's daily round was flawless – the wheel is unlocked. */
  available: boolean;
  /** What today's spin paid, or null while it has not been spun. */
  xpWon: number | null;
}

export async function fetchDailyWheel(): Promise<DailyWheelState> {
  const { data, error } = await supabase.rpc('get_my_daily_wheel');
  if (error) throw toAppError(error, 'Das Glücksrad konnte nicht geladen werden.');
  const payload = (data ?? {}) as { available?: boolean; xp_won?: number | null };
  return { available: payload.available === true, xpWon: payload.xp_won ?? null };
}

/**
 * Spins the wheel and returns the XP.
 *
 * The draw happens on the server – the wheel on screen is an animation of a
 * result that has already been decided, not the thing deciding it.
 */
export async function spinDailyWheel(): Promise<number> {
  const { data, error } = await supabase.rpc('spin_daily_wheel');
  if (error) throw toAppError(error, 'Das Glücksrad hat nicht reagiert. Bitte versuche es erneut.');
  return Number(data ?? 0);
}
