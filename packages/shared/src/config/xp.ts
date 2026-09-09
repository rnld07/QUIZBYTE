/**
 * XP and level configuration.
 *
 * IMPORTANT: the XP values per answer / session completion are also enforced by the
 * database (see `packages/database/supabase/migrations/*_functions.sql`,
 * function `public.xp_for_answer`). Keep both places in sync when changing them.
 */
export const xpConfig = {
  /** XP for a correct answer. */
  CORRECT_ANSWER_XP: 10,
  /** XP for a wrong answer – learning something still counts. */
  WRONG_ANSWER_XP: 2,
  /** Bonus XP for finishing a whole quiz session. */
  SESSION_COMPLETION_XP: 10,
  /** XP required to get from level 1 to level 2. */
  LEVEL_BASE_XP: 100,
  /** Each further level requires this much more XP than the previous one. */
  LEVEL_STEP_XP: 20,
  /** Safety cap so the level loop always terminates. */
  MAX_LEVEL: 999,
} as const;
