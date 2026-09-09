/** Configuration for weakness / strength detection. */
export const weaknessConfig = {
  /** A topic needs at least this many attempts before it is judged at all. */
  MIN_ATTEMPTS: 3,
  /** Accuracy (0–100) below which a topic counts as a weakness. */
  WEAKNESS_ACCURACY_THRESHOLD: 70,
  /** Accuracy (0–100) from which a topic counts as a strength. */
  STRENGTH_ACCURACY_THRESHOLD: 80,
  /** Maximum number of topics reported per list. */
  MAX_TOPICS: 5,
} as const;
