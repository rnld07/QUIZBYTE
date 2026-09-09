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
