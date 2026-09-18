import { xpConfig } from '../../config/xp';
import type { Difficulty, SessionType } from '../../types/domain';

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
export function xpForAnswer(isCorrect: boolean, difficulty: Difficulty = 'medium'): number {
  if (!isCorrect) return xpConfig.WRONG_ANSWER_XP;
  return xpConfig.CORRECT_ANSWER_XP[difficulty] ?? xpConfig.CORRECT_ANSWER_XP.medium;
}

/** Bonus XP for completing a session. Mirrors `public.complete_quiz_session`. */
export function xpForSessionCompletion(): number {
  return xpConfig.SESSION_COMPLETION_XP;
}

/** Returns the levels gained when moving from `fromXp` to `toXp` (0 if none). */
export function levelsGained(fromXp: number, toXp: number): number {
  return Math.max(0, computeLevelProgress(toXp).level - computeLevelProgress(fromXp).level);
}

export interface AttemptXpInput {
  isCorrect: boolean;
  difficulty: Difficulty;
  /** True when this question was already answered correctly at some point. */
  alreadyCorrect: boolean;
  /** The daily quiz pays double. */
  sessionType: SessionType;
  /** True for a second daily round on the same day – those pay nothing. */
  repeatedDaily?: boolean;
}

/**
 * XP for one answer. Mirrors `public.score_quiz_attempt` in the database.
 *
 * A question pays out for the **first correct** answer only: getting it right
 * after an earlier mistake still counts, repeating one you already knew does not.
 * A repeated daily round pays nothing at all – only the day's first one counts.
 *
 * The daily round is the exception to the "already knew it" rule: its five
 * questions are picked by the server and cannot be avoided, so every correct
 * answer pays there. Leaving this out made the result screen report a handful
 * of XP against a maximum that assumed the opposite.
 */
export function xpForAttempt({ isCorrect, difficulty, alreadyCorrect, sessionType, repeatedDaily = false }: AttemptXpInput): number {
  const isDaily = sessionType === 'daily';
  if (!isCorrect || repeatedDaily) return 0;
  if (alreadyCorrect && !isDaily) return 0;
  const base = xpForAnswer(true, difficulty);
  return isDaily ? base * xpConfig.DAILY_XP_MULTIPLIER : base;
}

/**
 * The most XP a session could have paid out: every question answered correctly
 * plus the completion bonus, with the daily multiplier applied to both.
 *
 * Used by the daily result to show "x von y XP" instead of the level bar.
 */
export function maxXpForSession(questions: readonly { difficulty: Difficulty }[], sessionType: SessionType): number {
  const multiplier = sessionType === 'daily' ? xpConfig.DAILY_XP_MULTIPLIER : 1;
  const answers = questions.reduce((sum, question) => sum + xpForAnswer(true, question.difficulty), 0);
  return (answers + xpConfig.SESSION_COMPLETION_XP) * multiplier;
}

/** The bit of an attempt this module needs to judge whether it could pay. */
export interface ScoredAttempt {
  questionId: string;
  isCorrect: boolean;
  xpEarned: number;
}

/**
 * The most XP a session could realistically have paid.
 *
 * A question that was answered correctly at some earlier point never pays
 * again, so a correct answer worth 0 XP is proof that this question could not
 * pay in this round – it is left out of the maximum. Without that, a perfect
 * round reads as "100 of 144 XP" even though 144 was never reachable.
 *
  * Questions answered wrong still count in full: those XP really were missed.
 *
 * The daily is the exception: its five questions are picked by the server, so
 * every correct answer pays there and everything is reachable.
 */
export function achievableXpForSession(
  questions: readonly { id: string; difficulty: Difficulty }[],
  sessionType: SessionType,
  attempts: readonly ScoredAttempt[],
): number {
  const blocked =
    sessionType === 'daily'
      ? new Set<string>()
      : new Set(attempts.filter((attempt) => attempt.isCorrect && attempt.xpEarned === 0).map((attempt) => attempt.questionId));
  const multiplier = sessionType === 'daily' ? xpConfig.DAILY_XP_MULTIPLIER : 1;
  const answers = questions.reduce(
    (sum, question) => (blocked.has(question.id) ? sum : sum + xpForAnswer(true, question.difficulty)),
    0,
  );
  return (answers + xpConfig.SESSION_COMPLETION_XP) * multiplier;
}

/**
 * XP for one correct duel answer.
 *
 * Rounded, because 1.5× an odd value is not a whole number and XP are integers –
 * the database rounds the same way.
 */
export function xpForDuelAnswer(difficulty: Difficulty): number {
  return Math.round(xpForAnswer(true, difficulty) * xpConfig.DUEL_XP_MULTIPLIER);
}

/** Bonus for the winner of a duel; a draw pays it to nobody. */
export function duelWinnerXp(myCorrect: number, theirCorrect: number): number {
  return myCorrect > theirCorrect ? xpConfig.DUEL_WIN_XP : 0;
}

/** Who won – `null` on a draw or while the duel is still open. */
export function duelOutcome(myCorrect: number | null, theirCorrect: number | null): 'won' | 'lost' | 'draw' | 'open' {
  if (myCorrect === null || theirCorrect === null) return 'open';
  if (myCorrect > theirCorrect) return 'won';
  if (myCorrect < theirCorrect) return 'lost';
  return 'draw';
}
