/** The minimum a row needs to be ranked. */
export interface RankableEntry {
  id: string;
  totalXp: number;
}

export interface RankedEntry<Entry extends RankableEntry> {
  entry: Entry;
  /** 1-based. Equal XP shares a rank, and the next rank skips accordingly. */
  rank: number;
  /** True for the row belonging to the viewer. */
  isMe: boolean;
}

/**
 * Orders players by XP and hands out ranks.
 *
 * Standard competition ranking: two people on the same XP share a place and
 * the one behind them gets the number that follows the count, not the next
 * number up – two firsts are followed by a third, never by a second.
 *
 * Ties below that are settled by id so the list does not reshuffle itself
 * between renders; a stable order matters more than which of two equals is
 * printed first.
 */
export function buildLeaderboard<Entry extends RankableEntry>(entries: Entry[], meId: string | null): RankedEntry<Entry>[] {
  const sorted = [...entries].sort((a, b) => b.totalXp - a.totalXp || a.id.localeCompare(b.id));

  let lastXp: number | null = null;
  let lastRank = 0;

  return sorted.map((entry, index) => {
    const rank = entry.totalXp === lastXp ? lastRank : index + 1;
    lastXp = entry.totalXp;
    lastRank = rank;
    return { entry, rank, isMe: entry.id === meId };
  });
}
