/** Accuracy as an integer percentage (0–100). Returns 0 when nothing was answered. */
export function computeAccuracy(correct: number, total: number): number {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return 0;
  const clampedCorrect = Math.min(Math.max(0, correct), total);
  return Math.round((clampedCorrect / total) * 100);
}

/** Formats an integer percentage for display, e.g. `82 %`. */
export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

/** Traffic-light band for an accuracy value. */
export type AccuracyTone = 'low' | 'mid' | 'high';

/**
 * Bands an accuracy percentage: below 34 is weak, 34–66 is okay, above 66 is
 * strong. Used to colour accuracy readouts consistently across the app.
 */
export function accuracyTone(accuracy: number): AccuracyTone {
  if (!Number.isFinite(accuracy) || accuracy < 34) return 'low';
  if (accuracy <= 66) return 'mid';
  return 'high';
}
