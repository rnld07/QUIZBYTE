import { describe, expect, it } from 'vitest';

import { duelScoreboard } from './duelScoreboard';

const base = {
  finished: false,
  closed: false,
  iPlayed: false,
  myCorrect: null,
  theirCorrect: null,
  mySettledCorrect: null,
};

describe('duelScoreboard', () => {
  it('shows my score and a clock for them once I have played', () => {
    const board = duelScoreboard({ ...base, iPlayed: true, myCorrect: 7 });

    expect(board.mine).toEqual({ kind: 'score', correct: 7 });
    expect(board.theirs).toEqual({ kind: 'waiting' });
  });

  it('never shows their score before the duel is settled', () => {
    const board = duelScoreboard({ ...base, iPlayed: true, myCorrect: 7, theirCorrect: 9 });

    expect(board.theirs).toEqual({ kind: 'waiting' });
  });

  it('waits on both sides while I have not played', () => {
    const board = duelScoreboard(base);

    expect(board.mine).toEqual({ kind: 'blank' });
    expect(board.theirs).toEqual({ kind: 'waiting' });
  });

  it('shows both scores once it is settled', () => {
    const board = duelScoreboard({ ...base, finished: true, mySettledCorrect: 6, theirCorrect: 9 });

    expect(board.mine).toEqual({ kind: 'score', correct: 6 });
    expect(board.theirs).toEqual({ kind: 'score', correct: 9 });
  });

  it('falls back to my counted score when the settlement stored none', () => {
    const board = duelScoreboard({ ...base, finished: true, myCorrect: 5, theirCorrect: 3 });

    expect(board.mine).toEqual({ kind: 'score', correct: 5 });
  });

  it('leaves a declined or expired duel empty on both sides', () => {
    const board = duelScoreboard({ ...base, closed: true, iPlayed: true, myCorrect: 7 });

    expect(board.mine).toEqual({ kind: 'blank' });
    expect(board.theirs).toEqual({ kind: 'blank' });
  });
});
