import { describe, expect, it } from 'vitest';

import { EMPTY_STREAK, applyStreakActivity, effectiveStreak, isStreakAtRisk } from './streak';

describe('applyStreakActivity', () => {
  it('starts a streak on the first activity', () => {
    const result = applyStreakActivity(EMPTY_STREAK, '2026-03-01');
    expect(result).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: '2026-03-01',
      changed: true,
      extended: false,
      reset: false,
    });
  });

  it('does not extend twice on the same day', () => {
    const first = applyStreakActivity(EMPTY_STREAK, '2026-03-01');
    const second = applyStreakActivity(first, '2026-03-01');
    expect(second.currentStreak).toBe(1);
    expect(second.changed).toBe(false);
    expect(second.lastActiveDate).toBe('2026-03-01');
  });

  it('extends on the following day', () => {
    const day1 = applyStreakActivity(EMPTY_STREAK, '2026-03-01');
    const day2 = applyStreakActivity(day1, '2026-03-02');
    expect(day2.currentStreak).toBe(2);
    expect(day2.longestStreak).toBe(2);
    expect(day2.extended).toBe(true);
  });

  it('handles month and year boundaries', () => {
    const state = applyStreakActivity(EMPTY_STREAK, '2025-12-31');
    const next = applyStreakActivity(state, '2026-01-01');
    expect(next.currentStreak).toBe(2);
    const feb = applyStreakActivity({ ...next, lastActiveDate: '2026-02-28' }, '2026-03-01');
    expect(feb.currentStreak).toBe(3);
  });

  it('resets to 1 after a skipped day but keeps the longest streak', () => {
    let state = applyStreakActivity(EMPTY_STREAK, '2026-03-01');
    state = applyStreakActivity(state, '2026-03-02');
    state = applyStreakActivity(state, '2026-03-03');
    const afterGap = applyStreakActivity(state, '2026-03-05');
    expect(afterGap.currentStreak).toBe(1);
    expect(afterGap.longestStreak).toBe(3);
    expect(afterGap.reset).toBe(true);
    expect(afterGap.changed).toBe(true);
  });

  it('ignores activity dated before the last active day (clock skew)', () => {
    const state = applyStreakActivity({ ...EMPTY_STREAK, currentStreak: 4, longestStreak: 4, lastActiveDate: '2026-03-10' }, '2026-03-09');
    expect(state.currentStreak).toBe(4);
    expect(state.lastActiveDate).toBe('2026-03-10');
    expect(state.changed).toBe(false);
  });

  it('rejects invalid dates', () => {
    expect(() => applyStreakActivity(EMPTY_STREAK, '01.03.2026')).toThrow();
  });
});

describe('effectiveStreak', () => {
  const state = { currentStreak: 5, longestStreak: 7, lastActiveDate: '2026-03-10' };

  it('shows the stored streak on the same day and the day after', () => {
    expect(effectiveStreak(state, '2026-03-10')).toBe(5);
    expect(effectiveStreak(state, '2026-03-11')).toBe(5);
  });

  it('shows 0 once a day was skipped', () => {
    expect(effectiveStreak(state, '2026-03-12')).toBe(0);
  });

  it('is 0 without activity', () => {
    expect(effectiveStreak(EMPTY_STREAK, '2026-03-12')).toBe(0);
  });
});

describe('isStreakAtRisk', () => {
  it('is at risk only on the day after the last activity', () => {
    const state = { currentStreak: 2, longestStreak: 2, lastActiveDate: '2026-03-10' };
    expect(isStreakAtRisk(state, '2026-03-10')).toBe(false);
    expect(isStreakAtRisk(state, '2026-03-11')).toBe(true);
    expect(isStreakAtRisk(state, '2026-03-12')).toBe(false);
    expect(isStreakAtRisk(EMPTY_STREAK, '2026-03-12')).toBe(false);
  });
});
