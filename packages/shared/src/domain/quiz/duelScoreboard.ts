/** What a duel's scoreboard is allowed to show for one side. */
export type DuelScoreSlot =
  /** A number that side has earned and is allowed to be seen. */
  | { kind: 'score'; correct: number }
  /** Still running – shown as a clock, never as a number. */
  | { kind: 'waiting' }
  /** Nothing to show and nothing to wait for: declined, or run out of time. */
  | { kind: 'blank' };

export interface DuelScoreboard {
  mine: DuelScoreSlot;
  theirs: DuelScoreSlot;
}

export interface DuelScoreboardInput {
  /** Settled duels are the only ones with both scores on them. */
  finished: boolean;
  /** Over without a result: declined, or past the deadline. */
  closed: boolean;
  /** Whether I have played my round. */
  iPlayed: boolean;
  /** My score, counted from my own session – available as soon as I played. */
  myCorrect: number | null;
  /** Their score. Only ever filled once the duel is settled. */
  theirCorrect: number | null;
  /** My score as the settlement stored it, which wins once there is one. */
  mySettledCorrect: number | null;
}

/**
 * Decides what each side of a duel scoreboard shows.
 *
 * The asymmetry is the point: my own round is mine to see the moment I have
 * played it, while the other side stays a clock until the duel is settled. If
 * the score of whoever went first were visible, the second player would walk in
 * knowing the number to beat – and could simply not bother when it is out of
 * reach.
 *
 * Once it is settled both numbers are public; there is nothing left to decide.
 */
export function duelScoreboard({
  finished,
  closed,
  iPlayed,
  myCorrect,
  theirCorrect,
  mySettledCorrect,
}: DuelScoreboardInput): DuelScoreboard {
  if (finished) {
    return {
      mine: slot(mySettledCorrect ?? myCorrect),
      theirs: slot(theirCorrect),
    };
  }

  // Nothing is coming: a dash reads as "never happened", a clock would be a lie.
  if (closed) return { mine: { kind: 'blank' }, theirs: { kind: 'blank' } };

  return {
    mine: iPlayed && myCorrect !== null ? { kind: 'score', correct: myCorrect } : { kind: 'blank' },
    theirs: { kind: 'waiting' },
  };
}

function slot(correct: number | null): DuelScoreSlot {
  return correct === null ? { kind: 'blank' } : { kind: 'score', correct };
}
