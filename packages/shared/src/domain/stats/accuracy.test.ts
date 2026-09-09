import { describe, expect, it } from 'vitest';

import { computeAccuracy, formatPercent } from './accuracy';

describe('computeAccuracy', () => {
  it('returns 0 without attempts', () => {
    expect(computeAccuracy(0, 0)).toBe(0);
    expect(computeAccuracy(5, 0)).toBe(0);
  });

  it('rounds to whole percentages', () => {
    expect(computeAccuracy(8, 10)).toBe(80);
    expect(computeAccuracy(2, 3)).toBe(67);
    expect(computeAccuracy(1, 3)).toBe(33);
    expect(computeAccuracy(10, 10)).toBe(100);
  });

  it('clamps impossible input', () => {
    expect(computeAccuracy(12, 10)).toBe(100);
    expect(computeAccuracy(-2, 10)).toBe(0);
    expect(computeAccuracy(Number.NaN, 10)).toBe(0);
  });
});

describe('formatPercent', () => {
  it('formats with a thin gap before the sign', () => {
    expect(formatPercent(82)).toBe('82 %');
    expect(formatPercent(66.6)).toBe('67 %');
  });
});
