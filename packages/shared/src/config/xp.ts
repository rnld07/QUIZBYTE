/**
 * XP and level configuration.
 *
 * IMPORTANT: the XP values per answer / session completion are also enforced by the
 * database (see `packages/database/supabase/migrations/*_functions.sql`,
 * function `public.xp_for_answer`). Keep both places in sync when changing them.
 */
export const xpConfig = {
  /** XP for a correct answer, by difficulty – harder questions are worth more. */
  CORRECT_ANSWER_XP: {
    easy: 8,
    medium: 12,
    hard: 18,
  },
  /** A wrong answer earns nothing. */
  WRONG_ANSWER_XP: 0,
  /** The daily quiz pays double. */
  DAILY_XP_MULTIPLIER: 2,
  /** A duel pays one and a half times per correct answer. */
  DUEL_XP_MULTIPLIER: 1.5,
  /** Bonus for winning a duel. A draw pays it to nobody. */
  DUEL_WIN_XP: 20,
  /** No bonus for finishing a session – XP come from correct answers only. */
  SESSION_COMPLETION_XP: 0,
  /** XP required to get from level 1 to level 2. */
  LEVEL_BASE_XP: 100,
  /** Each further level requires this much more XP than the previous one. */
  LEVEL_STEP_XP: 20,
  /** Safety cap so the level loop always terminates. */
  MAX_LEVEL: 999,
} as const;
