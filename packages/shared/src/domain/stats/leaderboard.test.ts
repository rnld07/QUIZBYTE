import { describe, expect, it } from 'vitest';

import { buildLeaderboard } from './leaderboard';

const player = (id: string, totalXp: number) => ({ id, totalXp });

describe('buildLeaderboard', () => {
  it('puts the most XP first', () => {
    const board = buildLeaderboard([player('a', 100), player('c', 900), player('b', 500)], null);

    expect(board.map((row) => row.entry.id)).toEqual(['c', 'b', 'a']);
    expect(board.map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it('shares a rank on equal XP and skips the one after it', () => {
    const board = buildLeaderboard([player('a', 500), player('b', 500), player('c', 100)], null);

    expect(board.map((row) => row.rank)).toEqual([1, 1, 3]);
  });

  it('marks the viewer', () => {
    const board = buildLeaderboard([player('a', 100), player('me', 900)], 'me');

    expect(board.map((row) => row.isMe)).toEqual([true, false]);
  });

  it('orders equals by id, so the list does not reshuffle between renders', () => {
    const first = buildLeaderboard([player('b', 300), player('a', 300)], null);
    const second = buildLeaderboard([player('a', 300), player('b', 300)], null);

    expect(first.map((row) => row.entry.id)).toEqual(second.map((row) => row.entry.id));
  });

  it('copes with an empty list', () => {
    expect(buildLeaderboard([], 'me')).toEqual([]);
  });
});
