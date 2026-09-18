import { DIFFICULTIES } from '../../types/domain';
import { shuffle } from '../../utils/random';
import type { Difficulty } from '../../types/domain';

/**
 * Which difficulties a session may draw from.
 *
 * An **empty** selection means "all" – that is the neutral state, not a broken
 * one. Picking every single level collapses back to it (see `toggleDifficulty`),
 * so "all three" and "Alle" are never two different things.
 */
export type DifficultySelection = readonly Difficulty[];

/** True while no level is singled out. */
export function isAllDifficulties(selection: DifficultySelection): boolean {
  return selection.length === 0 || selection.length >= DIFFICULTIES.length;
}

/** Keeps a selection in the canonical order and free of duplicates. */
export function normalizeDifficulties(selection: readonly string[]): Difficulty[] {
  const wanted = new Set(selection);
  const picked = DIFFICULTIES.filter((difficulty) => wanted.has(difficulty));
  // Every level selected is the same as no filter at all.
  return picked.length >= DIFFICULTIES.length ? [] : picked;
}

/**
 * Adds or removes one level.
 *
 * Two rules keep the control honest: selecting the last missing level falls back
 * to "all", and removing the last remaining one does too – a quiz without any
 * difficulty could not be played.
 */
export function toggleDifficulty(selection: DifficultySelection, difficulty: Difficulty): Difficulty[] {
  const active = isAllDifficulties(selection) ? [] : selection;
  const next = active.includes(difficulty) ? active.filter((entry) => entry !== difficulty) : [...active, difficulty];
  return normalizeDifficulties(next);
}

/** Label for a selection, e.g. `Leicht + Schwer`. */
export function describeDifficulties(selection: DifficultySelection, labels: Record<Difficulty, string>, allLabel: string): string {
  if (isAllDifficulties(selection)) return allLabel;
  return normalizeDifficulties(selection)
    .map((difficulty) => labels[difficulty])
    .join(' + ');
}

/**
 * Narrows a question pool to the wanted difficulties.
 *
 * If no question matches, the untouched pool is returned: a preference must
 * never leave the user without a quiz.
 */
export function filterByDifficulty<T extends { difficulty: Difficulty }>(pool: readonly T[], selection: DifficultySelection): T[] {
  if (isAllDifficulties(selection)) return [...pool];
  const wanted = new Set(selection);
  const matching = pool.filter((question) => wanted.has(question.difficulty));
  return matching.length > 0 ? matching : [...pool];
}

export interface RetuneOptions<T> {
  /** The questions the session is running with right now. */
  questions: readonly T[];
  /** Everything the session could have drawn from, before any filtering. */
  pool: readonly T[];
  /** Leading questions that must stay – the ones already answered. */
  keepCount: number;
  difficulties: DifficultySelection;
  random?: () => number;
}

/**
 * Swaps the not-yet-played part of a running session over to new difficulties.
 *
 * Answered questions stay exactly where they are: their attempts are already on
 * the server, and re-ordering them would make the result screen disagree with
 * the database. Only the tail is drawn again, which is why changing the setting
 * mid-quiz can take effect on the very next question.
 *
 * The session keeps its length. When too few questions match, the pool's
 * fallback in `filterByDifficulty` fills the rest, so a round never shrinks.
 */
export function retuneSessionQuestions<T extends { id: string; difficulty: Difficulty }>(options: RetuneOptions<T>): T[] {
  const { questions, pool, difficulties, random } = options;
  const keepCount = Math.max(0, Math.min(options.keepCount, questions.length));
  const kept = questions.slice(0, keepCount);
  const wanted = questions.length - keepCount;
  if (wanted <= 0 || pool.length === 0) return [...questions];

  const keptIds = new Set(kept.map((question) => question.id));
  const candidates = filterByDifficulty(pool, difficulties).filter((question) => !keptIds.has(question.id));
  if (candidates.length === 0) return [...questions];

  const shuffled = shuffle(candidates, random ?? Math.random);
  const tail = shuffled.slice(0, wanted);
  // Too few matches: keep the current questions in those slots rather than
  // handing back a shorter round.
  if (tail.length < wanted) tail.push(...questions.slice(keepCount + tail.length, questions.length));
  return [...kept, ...tail.slice(0, wanted)];
}
