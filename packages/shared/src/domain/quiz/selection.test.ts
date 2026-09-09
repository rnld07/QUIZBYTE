import { describe, expect, it } from 'vitest';

import { createSeededRandom } from '../../utils/random';
import { canStartSession, selectSessionQuestions } from './selection';

const make = (n: number, prefix = 'q') => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, weak: i % 2 === 0 }));

describe('selectSessionQuestions', () => {
  it('returns the requested number of unique questions', () => {
    const selected = selectSessionQuestions(make(40), { count: 10, random: createSeededRandom(1) });
    expect(selected).toHaveLength(10);
    expect(new Set(selected.map((q) => q.id)).size).toBe(10);
  });

  it('never returns duplicates even when the pool contains them', () => {
    const pool = [...make(5), ...make(5)];
    const selected = selectSessionQuestions(pool, { count: 10, random: createSeededRandom(2) });
    expect(selected).toHaveLength(5);
    expect(new Set(selected.map((q) => q.id)).size).toBe(5);
  });

  it('returns fewer questions when the pool is too small', () => {
    expect(selectSessionQuestions(make(3), { count: 10 })).toHaveLength(3);
    expect(selectSessionQuestions([], { count: 10 })).toEqual([]);
  });

  it('excludes given ids', () => {
    const selected = selectSessionQuestions(make(6), { count: 10, excludeIds: ['q0', 'q1'] });
    expect(selected.map((q) => q.id).sort()).toEqual(['q2', 'q3', 'q4', 'q5']);
  });

  it('prefers marked questions according to the configured share', () => {
    const pool = make(40);
    const selected = selectSessionQuestions(pool, {
      count: 10,
      isPreferred: (q) => q.weak,
      preferredShare: 0.7,
      random: createSeededRandom(3),
    });
    expect(selected).toHaveLength(10);
    expect(selected.filter((q) => q.weak)).toHaveLength(7);
  });

  it('fills up with preferred questions when there are not enough others', () => {
    const pool = make(10).map((q, i) => ({ ...q, weak: i < 9 }));
    const selected = selectSessionQuestions(pool, {
      count: 10,
      isPreferred: (q) => q.weak,
      random: createSeededRandom(4),
    });
    expect(selected).toHaveLength(10);
  });

  it('is deterministic for a given random source', () => {
    const a = selectSessionQuestions(make(30), { count: 5, random: createSeededRandom(42) });
    const b = selectSessionQuestions(make(30), { count: 5, random: createSeededRandom(42) });
    expect(a).toEqual(b);
  });
});

describe('canStartSession', () => {
  it('requires at least one question', () => {
    expect(canStartSession(0)).toBe(false);
    expect(canStartSession(1)).toBe(true);
  });
});
