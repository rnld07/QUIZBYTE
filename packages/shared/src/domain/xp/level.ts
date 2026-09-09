import { xpConfig } from '../../config/xp';

export interface LevelProgress {
  /** Current level, starting at 1. */
  level: number;
  /** XP the user has earned inside the current level. */
  xpIntoLevel: number;
  /** XP needed to complete the current level. */
  xpForLevel: number;
  /** XP still missing until the next level. */
  xpToNextLevel: number;
  /** Progress inside the current level, 0–100 (integer). */
  progressPercent: number;
  /** Total XP at which the current level started. */
  levelStartXp: number;
  /** Total XP at which the next level starts. */
  nextLevelXp: number;
}

/**
 * XP required to advance from `level` to `level + 1`.
 *
 * Progression is a gently increasing curve: every level needs `LEVEL_STEP_XP`
 * more than the previous one (100, 120, 140, …). Cumulative XP therefore grows
 * quadratically, which keeps early levels quick and later levels meaningful
 * without ever becoming unreachable.
 */
export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return xpConfig.LEVEL_BASE_XP + (safeLevel - 1) * xpConfig.LEVEL_STEP_XP;
}

/** Total XP needed to *reach* the given level (level 1 starts at 0 XP). */
export function totalXpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  const steps = safeLevel - 1;
  // Sum of an arithmetic series: steps * base + step * (0 + 1 + … + (steps - 1)).
  return steps * xpConfig.LEVEL_BASE_XP + (xpConfig.LEVEL_STEP_XP * steps * (steps - 1)) / 2;
}

/**
 * Derives the full level state from a total XP amount.
 * This is the single source of truth for level calculation in QuizByte.
 */
export function computeLevelProgress(totalXp: number): LevelProgress {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;

  let level = 1;
  let levelStartXp = 0;
  while (level < xpConfig.MAX_LEVEL && xp >= levelStartXp + xpRequiredForLevel(level)) {
    levelStartXp += xpRequiredForLevel(level);
    level += 1;
  }

  const xpForLevel = xpRequiredForLevel(level);
  const xpIntoLevel = Math.min(xp - levelStartXp, xpForLevel);
  const xpToNextLevel = Math.max(xpForLevel - xpIntoLevel, 0);
  const progressPercent = Math.min(100, Math.floor((xpIntoLevel / xpForLevel) * 100));

  return {
    level,
    xpIntoLevel,
    xpForLevel,
    xpToNextLevel,
    progressPercent,
    levelStartXp,
    nextLevelXp: levelStartXp + xpForLevel,
  };
}

/** XP awarded for a single answer. Mirrors `public.xp_for_answer` in the database. */
export function xpForAnswer(isCorrect: boolean): number {
  return isCorrect ? xpConfig.CORRECT_ANSWER_XP : xpConfig.WRONG_ANSWER_XP;
}

/** Bonus XP for completing a session. Mirrors `public.complete_quiz_session`. */
export function xpForSessionCompletion(): number {
  return xpConfig.SESSION_COMPLETION_XP;
}

/** Returns the levels gained when moving from `fromXp` to `toXp` (0 if none). */
export function levelsGained(fromXp: number, toXp: number): number {
  return Math.max(0, computeLevelProgress(toXp).level - computeLevelProgress(fromXp).level);
}
