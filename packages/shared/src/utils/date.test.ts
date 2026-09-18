import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, formatRelativeTime, isLocalDateString, toLocalDateString } from './date';

describe('toLocalDateString', () => {
  it('pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('daysBetween / addDays', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-03-01', '2026-03-04')).toBe(3);
    expect(daysBetween('2026-03-04', '2026-03-01')).toBe(-3);
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('isLocalDateString', () => {
  it('accepts only YYYY-MM-DD', () => {
    expect(isLocalDateString('2026-03-01')).toBe(true);
    expect(isLocalDateString('01.03.2026')).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-10T12:00:00.000Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('labels the last minute as "gerade eben"', () => {
    expect(formatRelativeTime(ago(30_000), now)).toBe('gerade eben');
  });

  it('never renders future timestamps (clock skew)', () => {
    expect(formatRelativeTime(new Date(now.getTime() + 60_000).toISOString(), now)).toBe('gerade eben');
  });

  it('labels minutes, hours and days', () => {
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('vor 5 Min.');
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe('vor 3 Std.');
    expect(formatRelativeTime(ago(24 * 3_600_000), now)).toBe('gestern');
    expect(formatRelativeTime(ago(3 * 24 * 3_600_000), now)).toBe('vor 3 Tagen');
  });

  it('falls back to a date after a week', () => {
    expect(formatRelativeTime('2026-02-20T12:00:00.000Z', now)).toMatch(/^20\.02\.2026$/);
  });

  it('returns an empty string for invalid input', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
