/**
 * How long a duel stays open.
 *
 * Must match `duel_deadline_days()` in SQL – the server is what actually closes
 * a duel, this is only what the app promises beforehand.
 *
 * Three days: long enough that a challenge survives a weekend away, short
 * enough that a chat does not fill up with duels nobody is going to play.
 */
export const DUEL_DEADLINE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When a duel started at `createdAt` closes. */
export function duelDeadline(createdAt: number): number {
  return createdAt + DUEL_DEADLINE_DAYS * DAY_MS;
}

/**
 * Whole days left, rounded up – 0 once the deadline has passed.
 *
 * Rounded up because that is how a deadline is read: with an hour to go you
 * have "one more day", not "zero".
 */
export function duelDaysLeft(createdAt: number, now: number): number {
  const remaining = duelDeadline(createdAt) - now;
  return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}

export function duelExpired(createdAt: number, now: number): boolean {
  return now >= duelDeadline(createdAt);
}

/** "Noch 2 Tage" – or what is left of the last one. */
export function duelDeadlineLabel(createdAt: number, now: number): string {
  const remaining = duelDeadline(createdAt) - now;
  if (remaining <= 0) return 'Abgelaufen';

  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  // Under a day the figure in days would read "noch 1 Tag" for both 23 hours
  // and 20 minutes, which is the difference between later and now.
  if (hours <= 24) return hours === 1 ? 'Noch 1 Stunde' : `Noch ${hours} Stunden`;

  const days = duelDaysLeft(createdAt, now);
  return days === 1 ? 'Noch 1 Tag' : `Noch ${days} Tage`;
}
