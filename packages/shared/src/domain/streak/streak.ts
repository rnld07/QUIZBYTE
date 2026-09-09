import { daysBetween, isLocalDateString } from '../../utils/date';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  /** Local calendar date (YYYY-MM-DD) of the last activity, or null if never active. */
  lastActiveDate: string | null;
}

export interface StreakUpdate extends StreakState {
  /** True when the streak counter changed (first activity of a new day). */
  changed: boolean;
  /** True when today's activity extended a streak that was alive yesterday. */
  extended: boolean;
  /** True when a previously existing streak was lost and restarted at 1. */
  reset: boolean;
}

export const EMPTY_STREAK: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
};

/**
 * Applies one day of activity to a streak.
 *
 * Rules:
 * - several sessions on the same local day extend the streak only once
 * - activity on the following day increments the streak
 * - a skipped day restarts the streak at 1
 *
 * `todayLocalDate` must be the user's *local* calendar date (see `toLocalDateString`).
 * The same rules are enforced in the database (`public.apply_streak`).
 */
export function applyStreakActivity(state: StreakState, todayLocalDate: string): StreakUpdate {
  if (!isLocalDateString(todayLocalDate)) {
    throw new Error(`Invalid local date: ${todayLocalDate}`);
  }

  const current = Math.max(0, state.currentStreak);
  const longest = Math.max(0, state.longestStreak, current);

  if (state.lastActiveDate === null) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longest, 1),
      lastActiveDate: todayLocalDate,
      changed: true,
      extended: false,
      reset: false,
    };
  }

  const diff = daysBetween(state.lastActiveDate, todayLocalDate);

  // Same day (or clock moved backwards): nothing changes.
  if (diff <= 0) {
    return {
      currentStreak: current,
      longestStreak: longest,
      lastActiveDate: state.lastActiveDate,
      changed: false,
      extended: false,
      reset: false,
    };
  }

  if (diff === 1) {
    const next = current + 1;
    return {
      currentStreak: next,
      longestStreak: Math.max(longest, next),
      lastActiveDate: todayLocalDate,
      changed: true,
      extended: true,
      reset: false,
    };
  }

  return {
    currentStreak: 1,
    longestStreak: Math.max(longest, 1),
    lastActiveDate: todayLocalDate,
    changed: true,
    extended: false,
    reset: current > 0,
  };
}

/**
 * The streak that should be *displayed* today. A streak whose last activity was
 * before yesterday is already broken even if the stored counter is still > 0.
 */
export function effectiveStreak(state: StreakState, todayLocalDate: string): number {
  if (state.lastActiveDate === null) return 0;
  const diff = daysBetween(state.lastActiveDate, todayLocalDate);
  return diff <= 1 ? Math.max(0, state.currentStreak) : 0;
}

/** True when the user has not played today yet but played yesterday (streak at risk). */
export function isStreakAtRisk(state: StreakState, todayLocalDate: string): boolean {
  if (state.lastActiveDate === null || state.currentStreak <= 0) return false;
  return daysBetween(state.lastActiveDate, todayLocalDate) === 1;
}
