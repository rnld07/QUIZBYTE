/** One slice of the wheel: what it pays and how likely it is. */
export interface WheelSegment {
  xp: number;
  /** Relative weight; the whole ring adds up to `WHEEL_WEIGHT_TOTAL`. */
  weight: number;
}

/**
 * The prize wheel for a flawless daily round.
 *
 * Mirrored by `spin_daily_wheel()` in SQL, which is where the draw actually
 * happens – this copy is what the app draws on screen, so the slices a player
 * sees are the slices they were spun against.
 *
 * Weighted towards the middle on purpose: almost nine spins in ten land between
 * 5 and 30 XP. The zero and the hundred are there to make the wheel worth
 * watching, not to carry the payout.
 */
export const WHEEL_SEGMENTS: readonly WheelSegment[] = [
  { xp: 10, weight: 18 },
  { xp: 25, weight: 12 },
  { xp: 5, weight: 14 },
  { xp: 50, weight: 7 },
  { xp: 15, weight: 18 },
  { xp: 0, weight: 3 },
  { xp: 20, weight: 15 },
  { xp: 100, weight: 3 },
  { xp: 30, weight: 10 },
];

export const WHEEL_WEIGHT_TOTAL = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);

/** Where a prize sits on the ring, so the pointer can be aimed at it. */
export function wheelSegmentIndex(xp: number): number {
  const index = WHEEL_SEGMENTS.findIndex((segment) => segment.xp === xp);
  return index === -1 ? 0 : index;
}

/** The angle, in degrees, of the middle of one slice. */
export function wheelSegmentAngle(index: number): number {
  const slice = 360 / WHEEL_SEGMENTS.length;
  return index * slice + slice / 2;
}
