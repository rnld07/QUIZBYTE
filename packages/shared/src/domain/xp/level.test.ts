import { describe, expect, it } from 'vitest';

import { xpConfig } from '../../config/xp';
import {
  computeLevelProgress,
  levelsGained,
  totalXpForLevel,
  xpForAnswer,
  xpForSessionCompletion,
  xpRequiredForLevel,
} from './level';

describe('xpRequiredForLevel', () => {
  it('starts at the base value and grows by the step each level', () => {
    expect(xpRequiredForLevel(1)).toBe(xpConfig.LEVEL_BASE_XP);
    expect(xpRequiredForLevel(2)).toBe(xpConfig.LEVEL_BASE_XP + xpConfig.LEVEL_STEP_XP);
    expect(xpRequiredForLevel(5)).toBe(xpConfig.LEVEL_BASE_XP + 4 * xpConfig.LEVEL_STEP_XP);
  });

  it('never drops below level 1 requirements for invalid input', () => {
    expect(xpRequiredForLevel(0)).toBe(xpConfig.LEVEL_BASE_XP);
    expect(xpRequiredForLevel(-3)).toBe(xpConfig.LEVEL_BASE_XP);
  });
});

describe('totalXpForLevel', () => {
  it('matches the cumulative sum of the per-level requirements', () => {
    let cumulative = 0;
    for (let level = 1; level <= 30; level += 1) {
      expect(totalXpForLevel(level)).toBe(cumulative);
      cumulative += xpRequiredForLevel(level);
    }
  });
});

describe('computeLevelProgress', () => {
  it('starts at level 1 with 0 XP', () => {
    const progress = computeLevelProgress(0);
    expect(progress.level).toBe(1);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.xpForLevel).toBe(100);
    expect(progress.xpToNextLevel).toBe(100);
    expect(progress.progressPercent).toBe(0);
    expect(progress.nextLevelXp).toBe(100);
  });

  it('reports progress within the first level', () => {
    const progress = computeLevelProgress(64);
    expect(progress.level).toBe(1);
    expect(progress.xpIntoLevel).toBe(64);
    expect(progress.xpToNextLevel).toBe(36);
    expect(progress.progressPercent).toBe(64);
  });

  it('levels up exactly at the threshold', () => {
    const progress = computeLevelProgress(100);
    expect(progress.level).toBe(2);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.xpForLevel).toBe(120);
    expect(progress.levelStartXp).toBe(100);
    expect(progress.nextLevelXp).toBe(220);
  });

  it('handles higher levels with the increasing curve', () => {
    // Level 1→2: 100, 2→3: 120, 3→4: 140 → level 4 starts at 360.
    const progress = computeLevelProgress(400);
    expect(progress.level).toBe(4);
    expect(progress.levelStartXp).toBe(360);
    expect(progress.xpIntoLevel).toBe(40);
    expect(progress.xpForLevel).toBe(160);
    expect(progress.progressPercent).toBe(25);
  });

  it('is consistent with totalXpForLevel for many levels', () => {
    for (let level = 1; level <= 50; level += 1) {
      const start = totalXpForLevel(level);
      expect(computeLevelProgress(start).level).toBe(level);
      expect(computeLevelProgress(start - 1).level).toBe(Math.max(1, level - 1));
    }
  });

  it('treats negative, fractional or invalid XP safely', () => {
    expect(computeLevelProgress(-50).level).toBe(1);
    expect(computeLevelProgress(99.9).level).toBe(1);
    expect(computeLevelProgress(Number.NaN).level).toBe(1);
    expect(computeLevelProgress(Number.POSITIVE_INFINITY).level).toBe(1);
  });

  it('never exceeds the max level', () => {
    expect(computeLevelProgress(1e12).level).toBe(xpConfig.MAX_LEVEL);
  });
});

describe('xp values', () => {
  it('awards configured XP per answer and per completed session', () => {
    expect(xpForAnswer(true)).toBe(xpConfig.CORRECT_ANSWER_XP);
    expect(xpForAnswer(false)).toBe(xpConfig.WRONG_ANSWER_XP);
    expect(xpForSessionCompletion()).toBe(xpConfig.SESSION_COMPLETION_XP);
  });

  it('computes levels gained between two XP totals', () => {
    expect(levelsGained(0, 50)).toBe(0);
    expect(levelsGained(90, 110)).toBe(1);
    expect(levelsGained(0, 400)).toBe(3);
    expect(levelsGained(400, 0)).toBe(0);
  });
});
