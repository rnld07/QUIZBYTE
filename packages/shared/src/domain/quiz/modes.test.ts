import { describe, expect, it } from 'vitest';

import { quizConfig } from '../../config/quiz';

import type { AttemptResult } from '../../types/domain';
import {
  DEFAULT_QUIZ_MODE,
  QUIZ_MODES,
  QUIZ_MODE_DEFINITIONS,
  countMistakes,
  isQuizMode,
  isRoundOver,
  livesLeft,
  quizModeById,
  quizModeLabel,
} from './modes';

const attempts = (pattern: string): AttemptResult[] =>
  [...pattern].map((mark, index) => ({
    questionId: `q${index}`,
    selectedAnswer: 'A',
    isCorrect: mark === '+',
    responseTimeMs: 1000,
    xpEarned: mark === '+' ? 10 : 0,
  }));

describe('quiz mode definitions', () => {
  it('offers exactly the four modes, in order', () => {
    expect(QUIZ_MODE_DEFINITIONS.map((mode) => mode.id)).toEqual([...QUIZ_MODES]);
  });

  it('gives every mode something to draw from and a tagline', () => {
    for (const mode of QUIZ_MODE_DEFINITIONS) {
      expect(mode.questionCount).toBeGreaterThan(0);
      expect(mode.duelQuestionCount).toBeGreaterThan(0);
      expect(mode.tagline.length).toBeGreaterThan(0);
      expect(mode.description.length).toBeGreaterThan(0);
    }
  });

  it('marks exactly the modes that end on their own rule as open', () => {
    expect(quizModeById('classic').openEnded).toBe(false);
    for (const mode of ['blitz', 'survival', 'perfect']) {
      expect(quizModeById(mode).openEnded).toBe(true);
    }
  });

  /*
    A perfect round used to be dealt five questions and stopped there, so
    answering all five correctly ended it – for a reason the mode never
    promised. An open round is dealt the whole pool instead.
  */
  it('deals every open mode the full pool, not the classic five', () => {
    for (const mode of ['blitz', 'survival', 'perfect']) {
      expect(quizModeById(mode).questionCount).toBe(quizConfig.OPEN_ROUND_LENGTH);
      expect(quizModeById(mode).questionCount).toBeGreaterThan(quizModeById('classic').questionCount);
    }
  });

  it('falls back to the classic mode for anything unknown', () => {
    expect(quizModeById('nonsense').id).toBe(DEFAULT_QUIZ_MODE);
    expect(quizModeById(null).id).toBe(DEFAULT_QUIZ_MODE);
    expect(quizModeById(undefined).id).toBe(DEFAULT_QUIZ_MODE);
  });

  it('recognises only the known ids', () => {
    expect(isQuizMode('blitz')).toBe(true);
    expect(isQuizMode('Blitz')).toBe(false);
    expect(isQuizMode(3)).toBe(false);
  });

  it('writes out the plain name', () => {
    expect(quizModeLabel('blitz')).toBe('Blitz');
    expect(quizModeLabel('classic')).toBe('Klassisch');
    expect(quizModeLabel('nonsense')).toBe('Klassisch');
  });
});

describe('livesLeft', () => {
  it('is null where the mode has no lives', () => {
    expect(livesLeft('classic', attempts('-+-'))).toBeNull();
    expect(livesLeft('blitz', attempts('-+-'))).toBeNull();
  });

  it('counts down one life per wrong answer', () => {
    expect(livesLeft('survival', attempts('++'))).toBe(3);
    expect(livesLeft('survival', attempts('+-+'))).toBe(2);
    expect(livesLeft('survival', attempts('---'))).toBe(0);
  });

  it('never drops below zero', () => {
    expect(livesLeft('survival', attempts('-----'))).toBe(0);
    expect(livesLeft('perfect', attempts('--'))).toBe(0);
  });

  it('ends the perfect round on the very first mistake', () => {
    expect(livesLeft('perfect', attempts('+++'))).toBe(1);
    expect(livesLeft('perfect', attempts('++-'))).toBe(0);
  });
});

describe('countMistakes', () => {
  it('counts only the wrong answers', () => {
    expect(countMistakes(attempts('+-+--'))).toBe(3);
    expect(countMistakes([])).toBe(0);
  });
});

describe('isRoundOver', () => {
  it('ends a classic round only after the last question', () => {
    expect(isRoundOver({ mode: 'classic', attempts: attempts('+-+-'), questionCount: 10 })).toBe(false);
    expect(isRoundOver({ mode: 'classic', attempts: attempts('+'.repeat(10)), questionCount: 10 })).toBe(true);
  });

  it('ends a survival round when the third life is gone', () => {
    expect(isRoundOver({ mode: 'survival', attempts: attempts('--'), questionCount: 30 })).toBe(false);
    expect(isRoundOver({ mode: 'survival', attempts: attempts('-+--'), questionCount: 30 })).toBe(true);
  });

  it('ends a perfect round on the first wrong answer', () => {
    expect(isRoundOver({ mode: 'perfect', attempts: attempts('+++'), questionCount: 10 })).toBe(false);
    expect(isRoundOver({ mode: 'perfect', attempts: attempts('++-'), questionCount: 10 })).toBe(true);
  });

  it('ends a blitz round when the clock runs out, whatever is left', () => {
    expect(isRoundOver({ mode: 'blitz', attempts: attempts('++'), questionCount: 30, remainingMs: 4000 })).toBe(false);
    expect(isRoundOver({ mode: 'blitz', attempts: attempts('++'), questionCount: 30, remainingMs: 0 })).toBe(true);
    expect(isRoundOver({ mode: 'blitz', attempts: attempts('++'), questionCount: 30, remainingMs: -250 })).toBe(true);
  });

  it('ends any round once the questions run out', () => {
    expect(isRoundOver({ mode: 'survival', attempts: attempts('+++'), questionCount: 3 })).toBe(true);
    expect(isRoundOver({ mode: 'blitz', attempts: attempts('+++'), questionCount: 3, remainingMs: 30_000 })).toBe(true);
  });
});
