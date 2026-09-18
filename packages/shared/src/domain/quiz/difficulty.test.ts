import { describe, expect, it } from 'vitest';

import type { Difficulty } from '../../types/domain';
import {
  describeDifficulties,
  filterByDifficulty,
  isAllDifficulties,
  normalizeDifficulties,
  retuneSessionQuestions,
  toggleDifficulty,
} from './difficulty';

const q = (id: string, difficulty: Difficulty) => ({ id, difficulty });

const pool = [q('a', 'easy'), q('b', 'medium'), q('c', 'hard'), q('d', 'easy')];
const ALL: Difficulty[] = [];

describe('filterByDifficulty', () => {
  it('returns the whole pool for an empty selection', () => {
    expect(filterByDifficulty(pool, ALL).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps only the selected difficulty', () => {
    expect(filterByDifficulty(pool, ['easy']).map((x) => x.id)).toEqual(['a', 'd']);
    expect(filterByDifficulty(pool, ['hard']).map((x) => x.id)).toEqual(['c']);
  });

  it('combines several difficulties', () => {
    expect(filterByDifficulty(pool, ['easy', 'hard']).map((x) => x.id)).toEqual(['a', 'c', 'd']);
  });

  it('treats every level as no filter', () => {
    expect(filterByDifficulty(pool, ['easy', 'medium', 'hard']).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('falls back to the full pool when nothing matches', () => {
    const easyOnly = [q('a', 'easy')];
    expect(filterByDifficulty(easyOnly, ['hard']).map((x) => x.id)).toEqual(['a']);
  });

  it('does not mutate the input', () => {
    const result = filterByDifficulty(pool, ALL);
    result.pop();
    expect(pool).toHaveLength(4);
  });

  it('handles an empty pool', () => {
    expect(filterByDifficulty([], ['easy'])).toEqual([]);
  });
});

describe('isAllDifficulties', () => {
  it('is true for the empty selection', () => {
    expect(isAllDifficulties(ALL)).toBe(true);
  });

  it('is true once every level is picked', () => {
    expect(isAllDifficulties(['easy', 'medium', 'hard'])).toBe(true);
  });

  it('is false for a partial selection', () => {
    expect(isAllDifficulties(['easy', 'hard'])).toBe(false);
  });
});

describe('normalizeDifficulties', () => {
  it('sorts into the canonical order and drops duplicates', () => {
    expect(normalizeDifficulties(['hard', 'easy', 'easy'])).toEqual(['easy', 'hard']);
  });

  it('ignores unknown values', () => {
    expect(normalizeDifficulties(['easy', 'extreme'])).toEqual(['easy']);
  });

  it('collapses a full selection to "all"', () => {
    expect(normalizeDifficulties(['easy', 'medium', 'hard'])).toEqual([]);
  });
});

describe('toggleDifficulty', () => {
  it('adds a level to an empty ("all") selection', () => {
    expect(toggleDifficulty(ALL, 'medium')).toEqual(['medium']);
  });

  it('adds a second level', () => {
    expect(toggleDifficulty(['easy'], 'hard')).toEqual(['easy', 'hard']);
  });

  it('falls back to "all" once the third level is added', () => {
    expect(toggleDifficulty(['easy', 'hard'], 'medium')).toEqual([]);
  });

  it('removes a selected level', () => {
    expect(toggleDifficulty(['easy', 'hard'], 'easy')).toEqual(['hard']);
  });

  it('falls back to "all" when the last level is removed', () => {
    expect(toggleDifficulty(['hard'], 'hard')).toEqual([]);
  });
});

describe('describeDifficulties', () => {
  const labels: Record<Difficulty, string> = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' };

  it('names the all-state', () => {
    expect(describeDifficulties(ALL, labels, 'Alle')).toBe('Alle');
  });

  it('joins several levels in the canonical order', () => {
    expect(describeDifficulties(['hard', 'easy'], labels, 'Alle')).toBe('Leicht + Schwer');
  });
});

describe('retuneSessionQuestions', () => {
  const big = [
    q('e1', 'easy'),
    q('e2', 'easy'),
    q('e3', 'easy'),
    q('m1', 'medium'),
    q('m2', 'medium'),
    q('h1', 'hard'),
    q('h2', 'hard'),
  ];
  // Deterministic "random" so the assertions are about the selection, not luck.
  const notRandom = () => 0;

  it('keeps the answered questions untouched', () => {
    const questions = [q('m1', 'medium'), q('m2', 'medium'), q('e1', 'easy')];
    const result = retuneSessionQuestions({ questions, pool: big, keepCount: 2, difficulties: ['hard'], random: notRandom });
    expect(result.slice(0, 2).map((x) => x.id)).toEqual(['m1', 'm2']);
  });

  it('draws the remaining questions from the new difficulty', () => {
    const questions = [q('m1', 'medium'), q('m2', 'medium'), q('e1', 'easy')];
    const result = retuneSessionQuestions({ questions, pool: big, keepCount: 2, difficulties: ['hard'], random: notRandom });
    expect(result.slice(2).every((x) => x.difficulty === 'hard')).toBe(true);
  });

  it('keeps the session length', () => {
    const questions = [q('m1', 'medium'), q('m2', 'medium'), q('e1', 'easy')];
    const result = retuneSessionQuestions({ questions, pool: big, keepCount: 1, difficulties: ['hard'], random: notRandom });
    expect(result).toHaveLength(3);
  });

  it('never repeats a kept question', () => {
    const questions = [q('h1', 'hard'), q('e1', 'easy'), q('e2', 'easy')];
    const result = retuneSessionQuestions({ questions, pool: big, keepCount: 1, difficulties: ['hard'], random: notRandom });
    expect(new Set(result.map((x) => x.id)).size).toBe(3);
  });

  it('leaves the session alone when nothing has to change', () => {
    const questions = [q('m1', 'medium'), q('m2', 'medium')];
    const result = retuneSessionQuestions({ questions, pool: big, keepCount: 2, difficulties: ['easy'], random: notRandom });
    expect(result.map((x) => x.id)).toEqual(['m1', 'm2']);
  });

  it('leaves fixed sets alone when there is no pool', () => {
    const questions = [q('m1', 'medium'), q('e1', 'easy')];
    const result = retuneSessionQuestions({ questions, pool: [], keepCount: 0, difficulties: ['hard'], random: notRandom });
    expect(result.map((x) => x.id)).toEqual(['m1', 'e1']);
  });
});
