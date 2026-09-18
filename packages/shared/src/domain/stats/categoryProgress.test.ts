import { describe, expect, it } from 'vitest';

import { mergeCategoryProgress } from './categoryProgress';
import type { CategoryLike } from './categoryProgress';

const category = (id: string, name: string, sortOrder: number): CategoryLike => ({
  id,
  name,
  slug: name.toLowerCase(),
  icon: null,
  accentColor: null,
  sortOrder,
});

const categories = [category('a', 'Alpha', 10), category('b', 'Beta', 20), category('c', 'Gamma', 30)];

describe('mergeCategoryProgress', () => {
  it('keeps every category, even without attempts', () => {
    const rows = mergeCategoryProgress(categories, [{ key: 'b', attempts: 4, correct: 2 }]);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('computes accuracy and marks unplayed categories', () => {
    const rows = mergeCategoryProgress(categories, [{ key: 'b', attempts: 4, correct: 3 }]);
    const beta = rows.find((row) => row.id === 'b');
    const alpha = rows.find((row) => row.id === 'a');
    expect(beta).toMatchObject({ attempts: 4, correct: 3, accuracy: 75, played: true });
    expect(alpha).toMatchObject({ attempts: 0, correct: 0, accuracy: 0, played: false });
  });

  it('sorts played categories first, best accuracy first', () => {
    const rows = mergeCategoryProgress(categories, [
      { key: 'c', attempts: 10, correct: 5 },
      { key: 'b', attempts: 10, correct: 9 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks accuracy ties by the number of attempts', () => {
    const rows = mergeCategoryProgress(categories, [
      { key: 'a', attempts: 2, correct: 1 },
      { key: 'b', attempts: 20, correct: 10 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['b', 'a', 'c']);
  });

  it('orders untouched categories by their configured sort order', () => {
    const rows = mergeCategoryProgress([category('z', 'Zeta', 5), ...categories], []);
    expect(rows.map((row) => row.id)).toEqual(['z', 'a', 'b', 'c']);
  });

  it('ignores stats for categories that no longer exist', () => {
    const rows = mergeCategoryProgress(categories, [{ key: 'gone', attempts: 5, correct: 5 }]);
    expect(rows.every((row) => !row.played)).toBe(true);
  });
});
