import { quizConfig } from '../../config/quiz';
import { shuffle } from '../../utils/random';

export interface SelectionOptions<T> {
  /** Number of questions wanted (defaults to `DEFAULT_QUIZ_LENGTH`). */
  count?: number;
  /**
   * Optional predicate marking "preferred" questions (e.g. from weak topics).
   * Roughly `preferredShare` of the session is filled with them when available.
   */
  isPreferred?: (question: T) => boolean;
  /** Share (0–1) of the session that should come from preferred questions. */
  preferredShare?: number;
  /** Random source – injectable for deterministic tests. */
  random?: () => number;
  /** Question ids to exclude (e.g. already played in this session). */
  excludeIds?: Iterable<string>;
}

/**
 * Picks questions for a session without duplicates.
 *
 * - never returns the same id twice, even if the pool contains duplicates
 * - returns fewer questions than requested when the pool is too small
 * - when `isPreferred` is given, preferred questions fill the first part of the
 *   session and random questions fill the rest; the final order is shuffled
 */
export function selectSessionQuestions<T extends { id: string }>(
  pool: readonly T[],
  options: SelectionOptions<T> = {},
): T[] {
  const count = Math.max(0, Math.floor(options.count ?? quizConfig.DEFAULT_QUIZ_LENGTH));
  const random = options.random ?? Math.random;
  const excluded = new Set(options.excludeIds ?? []);

  const unique: T[] = [];
  const seen = new Set<string>();
  for (const question of pool) {
    if (seen.has(question.id) || excluded.has(question.id)) continue;
    seen.add(question.id);
    unique.push(question);
  }

  if (count === 0 || unique.length === 0) return [];

  if (!options.isPreferred) {
    return shuffle(unique, random).slice(0, count);
  }

  const share = Math.min(1, Math.max(0, options.preferredShare ?? quizConfig.WEAKNESS_PREFERRED_SHARE));
  const preferred = shuffle(unique.filter(options.isPreferred), random);
  const others = shuffle(unique.filter((question) => !options.isPreferred?.(question)), random);

  const preferredTarget = Math.min(preferred.length, Math.round(count * share));
  const selected = preferred.slice(0, preferredTarget);
  const remaining = count - selected.length;
  selected.push(...others.slice(0, remaining));

  // Top up with more preferred questions if there were not enough "others".
  if (selected.length < count) {
    selected.push(...preferred.slice(preferredTarget, preferredTarget + (count - selected.length)));
  }

  return shuffle(selected, random);
}

/** Simple guard: can a session start with this many available questions? */
export function canStartSession(availableQuestions: number): boolean {
  return availableQuestions >= quizConfig.MIN_QUESTIONS_TO_START;
}
