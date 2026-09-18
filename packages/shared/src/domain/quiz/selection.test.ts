import { describe, expect, it } from 'vitest';

import { createSeededRandom } from '../../utils/random';
import { canStartSession, preferUnseenQuestions, selectSessionQuestions } from './selection';

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

describe('preferUnseenQuestions', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('drops questions that were already answered', () => {
    expect(preferUnseenQuestions(pool, ['b']).map((q) => q.id)).toEqual(['a', 'c']);
  });

  it('returns the whole pool when nothing was answered yet', () => {
    expect(preferUnseenQuestions(pool, []).map((q) => q.id)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to the full pool once everything has been seen', () => {
    expect(preferUnseenQuestions(pool, ['a', 'b', 'c']).map((q) => q.id)).toEqual(['a', 'b', 'c']);
  });

  it('ignores ids that are not in the pool', () => {
    expect(preferUnseenQuestions(pool, ['x', 'a']).map((q) => q.id)).toEqual(['b', 'c']);
  });

  it('tops up with seen questions when there are not enough new ones', () => {
    // A round that wants three cannot be cut down to the single new question.
    expect(preferUnseenQuestions(pool, ['a', 'b'], 3).map((q) => q.id)).toEqual(['c', 'a', 'b']);
  });

  it('puts the new questions first when it has to top up', () => {
    const [first] = preferUnseenQuestions(pool, ['a', 'c'], 2);
    expect(first?.id).toBe('b');
  });

  it('stays with the new questions alone once there are enough of them', () => {
    expect(preferUnseenQuestions(pool, ['a'], 2).map((q) => q.id)).toEqual(['b', 'c']);
    expect(preferUnseenQuestions(pool, [], 2).map((q) => q.id)).toEqual(['a', 'b', 'c']);
  });

  it('never invents questions the pool does not have', () => {
    expect(preferUnseenQuestions(pool, ['a', 'b', 'c'], 10)).toHaveLength(3);
    expect(preferUnseenQuestions([], ['a'], 5)).toEqual([]);
  });
});
