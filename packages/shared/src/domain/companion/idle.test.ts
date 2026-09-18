import { describe, expect, it } from 'vitest';

import { IDLE_MAX_DELAY_MS, IDLE_MIN_DELAY_MS, SLEEP_AFTER_MS, nextIdleAction } from './idle';
import { canInterruptCompanionState, isCompanionState, isTransientCompanionState } from './states';

/** Hands out the given numbers in order, then repeats the last one. */
const rolls = (...values: number[]) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
};

describe('nextIdleAction', () => {
  it('blinks most of the time', () => {
    expect(nextIdleAction(0, rolls(0.1, 0.5)).state).toBe('blink');
  });

  it('looks left and right for the middle of the range', () => {
    expect(nextIdleAction(0, rolls(0.6, 0.5)).state).toBe('lookLeft');
    expect(nextIdleAction(0, rolls(0.8, 0.5)).state).toBe('lookRight');
  });

  it('sometimes does nothing at all', () => {
    expect(nextIdleAction(0, rolls(0.99, 0.5)).state).toBe('idle');
  });

  it('keeps the pause inside its range', () => {
    const action = nextIdleAction(0, rolls(0.1, 0.5));

    expect(action.delayMs).toBeGreaterThanOrEqual(IDLE_MIN_DELAY_MS);
    expect(action.delayMs).toBeLessThanOrEqual(IDLE_MAX_DELAY_MS);
  });

  it('falls asleep once nothing has happened for long enough', () => {
    expect(nextIdleAction(SLEEP_AFTER_MS, rolls(0.1)).state).toBe('sleep');
    expect(nextIdleAction(SLEEP_AFTER_MS + 10_000, rolls(0.9)).state).toBe('sleep');
  });

  it('does not let a fidget hold it awake past bedtime', () => {
    const action = nextIdleAction(SLEEP_AFTER_MS - 1_000, rolls(0.1, 0.99));

    expect(action.delayMs).toBeLessThanOrEqual(1_000);
  });

  it('survives a broken random source', () => {
    const action = nextIdleAction(0, () => Number.NaN);

    expect(action.state).toBe('blink');
    expect(action.delayMs).toBe(IDLE_MIN_DELAY_MS);
  });
});

describe('companion states', () => {
  it('knows which states are performances and which are resting places', () => {
    expect(isTransientCompanionState('happy')).toBe(true);
    expect(isTransientCompanionState('idle')).toBe(false);
    expect(isTransientCompanionState('sleep')).toBe(false);
  });

  it('never lets a fidget cut off a celebration', () => {
    expect(canInterruptCompanionState('celebrate', 'blink')).toBe(false);
    expect(canInterruptCompanionState('blink', 'celebrate')).toBe(true);
  });

  it('lets one reaction replace another, so the newest answer is the one shown', () => {
    expect(canInterruptCompanionState('happy', 'sad')).toBe(true);
  });

  it('recognises its own state names', () => {
    expect(isCompanionState('celebrate')).toBe(true);
    expect(isCompanionState('dance')).toBe(false);
    expect(isCompanionState(7)).toBe(false);
  });
});
