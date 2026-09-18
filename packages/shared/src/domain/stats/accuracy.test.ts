import { describe, expect, it } from 'vitest';

import { accuracyTone, computeAccuracy, formatPercent } from './accuracy';

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

describe('accuracyTone', () => {
  it('bands below 34 as low', () => {
    expect(accuracyTone(0)).toBe('low');
    expect(accuracyTone(33)).toBe('low');
  });

  it('bands 34 to 66 as mid', () => {
    expect(accuracyTone(34)).toBe('mid');
    expect(accuracyTone(50)).toBe('mid');
    expect(accuracyTone(66)).toBe('mid');
  });

  it('bands above 66 as high', () => {
    expect(accuracyTone(67)).toBe('high');
    expect(accuracyTone(100)).toBe('high');
  });

  it('treats invalid input as low', () => {
    expect(accuracyTone(Number.NaN)).toBe('low');
  });
});
