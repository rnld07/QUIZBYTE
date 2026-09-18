/**
 * Local calendar date helpers.
 *
 * Streaks are based on the user's local calendar day, so we always work with
 * `YYYY-MM-DD` strings derived from the device time zone.
 */

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Formats a Date as YYYY-MM-DD using the device's local time zone. */
export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isLocalDateString(value: string): boolean {
  return LOCAL_DATE_PATTERN.test(value);
}

/**
 * Whole days between two YYYY-MM-DD strings (b - a). Uses UTC arithmetic on the
 * calendar components so DST changes never produce fractional days.
 */
export function daysBetween(a: string, b: string): number {
  const toUtc = (value: string): number => {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Adds (or subtracts) days to a YYYY-MM-DD string. */
export function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * German relative time label for an ISO timestamp, e.g. "vor 5 Min.".
 * Falls back to a `DD.MM.YYYY` date once the timestamp is older than a week.
 */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const then = new Date(isoTimestamp);
  const thenMs = then.getTime();
  if (!Number.isFinite(thenMs)) return '';

  const diffSeconds = Math.floor((now.getTime() - thenMs) / 1000);
  // Clock skew between device and server must never render as "in der Zukunft".
  if (diffSeconds < 60) return 'gerade eben';

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;

  return `${pad(then.getDate())}.${pad(then.getMonth() + 1)}.${then.getFullYear()}`;
}
