import { describe, expect, it } from 'vitest';

import {
  DAILY_TASK_COUNT,
  DAILY_TASK_DEFINITIONS,
  dailyTaskByKey,
  isDailyTaskClaimable,
  isDailyTaskDone,
  unclaimedDailyTaskXp,
} from './dailyTasks';
import { WHEEL_SEGMENTS, WHEEL_WEIGHT_TOTAL, wheelSegmentAngle, wheelSegmentIndex } from './dailyWheel';

const task = (key: string, progress: number, target: number, claimed = false) =>
  ({ key, progress, target, claimed }) as Parameters<typeof isDailyTaskDone>[0];

describe('daily tasks', () => {
  it('offers more than a day uses, so the three can differ', () => {
    expect(DAILY_TASK_DEFINITIONS.length).toBeGreaterThan(DAILY_TASK_COUNT);
  });

  it('gives every task a target, a payout and wording', () => {
    for (const definition of DAILY_TASK_DEFINITIONS) {
      expect(definition.target).toBeGreaterThan(0);
      expect(definition.xp).toBeGreaterThan(0);
      expect(definition.describe(definition.target).length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate keys', () => {
    const keys = DAILY_TASK_DEFINITIONS.map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('finds a task by key and nothing for an unknown one', () => {
    expect(dailyTaskByKey('play_daily')?.target).toBe(1);
    expect(dailyTaskByKey('nonsense')).toBeUndefined();
  });

  it('counts a task as done at its target, not one past it', () => {
    expect(isDailyTaskDone(task('answer_questions', 14, 15))).toBe(false);
    expect(isDailyTaskDone(task('answer_questions', 15, 15))).toBe(true);
    expect(isDailyTaskDone(task('answer_questions', 40, 15))).toBe(true);
  });

  it('only offers a payout that has not been taken', () => {
    expect(isDailyTaskClaimable(task('play_daily', 1, 1))).toBe(true);
    expect(isDailyTaskClaimable(task('play_daily', 1, 1, true))).toBe(false);
    expect(isDailyTaskClaimable(task('play_daily', 0, 1))).toBe(false);
  });

  it('adds up what is still waiting', () => {
    const waiting = unclaimedDailyTaskXp([
      task('play_daily', 1, 1),
      task('perfect_round', 1, 1, true),
      task('blitz_round', 0, 1),
    ]);
    expect(waiting).toBe(dailyTaskByKey('play_daily')?.xp);
  });
});

describe('daily wheel', () => {
  it('is weighted towards the middle – most spins pay 5 to 30', () => {
    const middle = WHEEL_SEGMENTS.filter((segment) => segment.xp >= 5 && segment.xp <= 30).reduce(
      (sum, segment) => sum + segment.weight,
      0,
    );
    expect(middle / WHEEL_WEIGHT_TOTAL).toBeGreaterThan(0.8);
  });

  it('stays inside the promised range', () => {
    for (const segment of WHEEL_SEGMENTS) {
      expect(segment.xp).toBeGreaterThanOrEqual(0);
      expect(segment.xp).toBeLessThanOrEqual(100);
      expect(segment.weight).toBeGreaterThan(0);
    }
  });

  it('points at the middle of the slice it was given', () => {
    const slice = 360 / WHEEL_SEGMENTS.length;
    expect(wheelSegmentAngle(0)).toBeCloseTo(slice / 2);
    expect(wheelSegmentAngle(1)).toBeCloseTo(slice * 1.5);
  });

  it('falls back to the first slice for a prize that is not on the wheel', () => {
    expect(wheelSegmentIndex(WHEEL_SEGMENTS[2]!.xp)).toBe(2);
    expect(wheelSegmentIndex(999)).toBe(0);
  });
});
