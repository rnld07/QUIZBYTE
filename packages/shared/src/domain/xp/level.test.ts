import { describe, expect, it } from 'vitest';

import { xpConfig } from '../../config/xp';
import {
  achievableXpForSession,
  computeLevelProgress,
  duelOutcome,
  duelWinnerXp,
  levelsGained,
  maxXpForSession,
  totalXpForLevel,
  xpForAnswer,
  xpForAttempt,
  xpForDuelAnswer,
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
  it('awards XP by difficulty for a correct answer', () => {
    expect(xpForAnswer(true, 'easy')).toBe(xpConfig.CORRECT_ANSWER_XP.easy);
    expect(xpForAnswer(true, 'medium')).toBe(xpConfig.CORRECT_ANSWER_XP.medium);
    expect(xpForAnswer(true, 'hard')).toBe(xpConfig.CORRECT_ANSWER_XP.hard);
  });

  it('scales upwards with difficulty', () => {
    expect(xpForAnswer(true, 'easy')).toBeLessThan(xpForAnswer(true, 'medium'));
    expect(xpForAnswer(true, 'medium')).toBeLessThan(xpForAnswer(true, 'hard'));
  });

  it('awards nothing for a wrong answer, whatever the difficulty', () => {
    expect(xpForAnswer(false, 'easy')).toBe(0);
    expect(xpForAnswer(false, 'medium')).toBe(0);
    expect(xpForAnswer(false, 'hard')).toBe(0);
  });

  it('falls back to the medium tier without a difficulty', () => {
    expect(xpForAnswer(true)).toBe(xpConfig.CORRECT_ANSWER_XP.medium);
  });

  it('awards the configured session completion bonus', () => {
    expect(xpForSessionCompletion()).toBe(xpConfig.SESSION_COMPLETION_XP);
  });

  it('computes levels gained between two XP totals', () => {
    expect(levelsGained(0, 50)).toBe(0);
    expect(levelsGained(90, 110)).toBe(1);
    expect(levelsGained(0, 400)).toBe(3);
    expect(levelsGained(400, 0)).toBe(0);
  });
});

describe('xpForAttempt', () => {
  const base = { difficulty: 'medium' as const, sessionType: 'category' as const };

  it('pays for the first correct answer', () => {
    expect(xpForAttempt({ ...base, isCorrect: true, alreadyCorrect: false })).toBe(xpConfig.CORRECT_ANSWER_XP.medium);
  });

  it('pays when a previously wrong question is finally answered correctly', () => {
    // alreadyCorrect only tracks *correct* attempts, so an earlier mistake still pays.
    expect(xpForAttempt({ ...base, isCorrect: true, alreadyCorrect: false })).toBeGreaterThan(0);
  });

  it('pays nothing for a question that was already answered correctly', () => {
    expect(xpForAttempt({ ...base, isCorrect: true, alreadyCorrect: true })).toBe(0);
  });

  it('pays nothing for a wrong answer', () => {
    expect(xpForAttempt({ ...base, isCorrect: false, alreadyCorrect: false })).toBe(0);
    expect(xpForAttempt({ ...base, isCorrect: false, alreadyCorrect: true })).toBe(0);
  });

  it('doubles the payout in the daily quiz', () => {
    const daily = xpForAttempt({ ...base, sessionType: 'daily', isCorrect: true, alreadyCorrect: false });
    expect(daily).toBe(xpConfig.CORRECT_ANSWER_XP.medium * xpConfig.DAILY_XP_MULTIPLIER);
  });

  it('still pays in the daily quiz for a question that was already known', () => {
    // The server picks the five daily questions, so there is no avoiding one you
    // have seen – the rule that blocks a repeat elsewhere would make the round
    // pay almost nothing while the shown maximum assumes it pays in full.
    const daily = xpForAttempt({ ...base, sessionType: 'daily', isCorrect: true, alreadyCorrect: true });
    expect(daily).toBe(xpConfig.CORRECT_ANSWER_XP.medium * xpConfig.DAILY_XP_MULTIPLIER);
  });

  it('adds up to the maximum the daily result shows', () => {
    // What went wrong in the app: every answer right, but the sum came out far
    // below `achievableXpForSession`, which exempts the daily.
    const questions = [
      { id: 'a', difficulty: 'easy' as const },
      { id: 'b', difficulty: 'medium' as const },
      { id: 'c', difficulty: 'hard' as const },
    ];
    const earned = questions.reduce(
      (sum, question) =>
        sum + xpForAttempt({ difficulty: question.difficulty, sessionType: 'daily', isCorrect: true, alreadyCorrect: true }),
      0,
    );
    const attempts = questions.map((question) => ({ questionId: question.id, isCorrect: true, xpEarned: 0 }));
    expect(earned).toBe(achievableXpForSession(questions, 'daily', attempts));
  });

  it('keeps the difficulty tiers inside the daily quiz', () => {
    const easy = xpForAttempt({ difficulty: 'easy', sessionType: 'daily', isCorrect: true, alreadyCorrect: false });
    const hard = xpForAttempt({ difficulty: 'hard', sessionType: 'daily', isCorrect: true, alreadyCorrect: false });
    expect(easy).toBeLessThan(hard);
  });
});

describe('xpForAttempt in a repeated daily round', () => {
  const daily = { difficulty: 'medium' as const, sessionType: 'daily' as const, repeatedDaily: true };

  it('pays nothing, even for a question never answered correctly', () => {
    expect(xpForAttempt({ ...daily, isCorrect: true, alreadyCorrect: false })).toBe(0);
  });

  it('still pays on the first daily round of the day', () => {
    expect(xpForAttempt({ ...daily, repeatedDaily: false, isCorrect: true, alreadyCorrect: false })).toBeGreaterThan(0);
  });
});

describe('maxXpForSession', () => {
  const questions = [{ difficulty: 'easy' as const }, { difficulty: 'hard' as const }];

  it('sums the per-question payout plus the completion bonus', () => {
    const expected = xpConfig.CORRECT_ANSWER_XP.easy + xpConfig.CORRECT_ANSWER_XP.hard + xpConfig.SESSION_COMPLETION_XP;
    expect(maxXpForSession(questions, 'category')).toBe(expected);
  });

  it('doubles everything for the daily quiz', () => {
    expect(maxXpForSession(questions, 'daily')).toBe(maxXpForSession(questions, 'category') * xpConfig.DAILY_XP_MULTIPLIER);
  });

  it('still counts the bonus for an empty question list', () => {
    expect(maxXpForSession([], 'category')).toBe(xpConfig.SESSION_COMPLETION_XP);
  });
});

describe('achievableXpForSession', () => {
  const bonus = xpConfig.SESSION_COMPLETION_XP;

  const questions = [
    { id: 'a', difficulty: 'easy' as const },
    { id: 'b', difficulty: 'medium' as const },
    { id: 'c', difficulty: 'hard' as const },
  ];

  it('matches the theoretical maximum when every question can still pay', () => {
    const attempts = [{ questionId: 'a', isCorrect: true, xpEarned: 8 }];
    expect(achievableXpForSession(questions, 'category', attempts)).toBe(8 + 12 + 18 + bonus);
  });

  it('drops questions whose correct answer paid nothing', () => {
    const attempts = [
      { questionId: 'a', isCorrect: true, xpEarned: 0 },
      { questionId: 'b', isCorrect: true, xpEarned: 12 },
    ];
    expect(achievableXpForSession(questions, 'category', attempts)).toBe(12 + 18 + bonus);
  });

  it('keeps wrongly answered questions in the maximum', () => {
    const attempts = [{ questionId: 'c', isCorrect: false, xpEarned: 0 }];
    expect(achievableXpForSession(questions, 'category', attempts)).toBe(8 + 12 + 18 + bonus);
  });

  it('doubles the daily maximum', () => {
    expect(achievableXpForSession(questions, 'daily', [])).toBe((8 + 12 + 18 + bonus) * 2);
  });

  it('a perfect round can reach its own maximum exactly', () => {
    // Outside the daily a question that paid nothing is out of the maximum too,
    // so a round with every answer right ends exactly at 100 %.
    const attempts = [
      { questionId: 'a', isCorrect: true, xpEarned: 0 },
      { questionId: 'b', isCorrect: true, xpEarned: 12 },
      { questionId: 'c', isCorrect: true, xpEarned: 18 },
    ];
    const earned = attempts.reduce((sum, attempt) => sum + attempt.xpEarned, 0) + bonus;
    expect(achievableXpForSession(questions, 'category', attempts)).toBe(earned);
  });
});

describe('duels', () => {
  it('pays one and a half times per correct answer', () => {
    expect(xpForDuelAnswer('easy')).toBe(12);
    expect(xpForDuelAnswer('medium')).toBe(18);
    expect(xpForDuelAnswer('hard')).toBe(27);
  });

  it('pays the winner bonus only to the winner', () => {
    expect(duelWinnerXp(4, 2)).toBe(xpConfig.DUEL_WIN_XP);
    expect(duelWinnerXp(2, 4)).toBe(0);
  });

  it('pays nobody on a draw', () => {
    expect(duelWinnerXp(3, 3)).toBe(0);
  });

  it('names the outcome', () => {
    expect(duelOutcome(4, 2)).toBe('won');
    expect(duelOutcome(2, 4)).toBe('lost');
    expect(duelOutcome(3, 3)).toBe('draw');
    expect(duelOutcome(3, null)).toBe('open');
  });
});

describe('achievableXpForSession in a daily round', () => {
  const questions = [
    { id: 'a', difficulty: 'easy' as const },
    { id: 'b', difficulty: 'medium' as const },
  ];

  it('keeps questions that paid nothing – the daily pays for every correct answer', () => {
    const attempts = [
      { questionId: 'a', isCorrect: true, xpEarned: 0 },
      { questionId: 'b', isCorrect: true, xpEarned: 0 },
    ];
    expect(achievableXpForSession(questions, 'daily', attempts)).toBe((8 + 12 + xpConfig.SESSION_COMPLETION_XP) * 2);
  });

  it('still drops them outside the daily', () => {
    const attempts = [{ questionId: 'a', isCorrect: true, xpEarned: 0 }];
    expect(achievableXpForSession(questions, 'category', attempts)).toBe(12 + xpConfig.SESSION_COMPLETION_XP);
  });
});
