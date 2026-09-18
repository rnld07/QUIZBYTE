import type { CompanionState } from '@quizbyte/shared';

/** Which side of the screen the companion sits on. */
export type CompanionSide = 'left' | 'right';

export interface CompanionPlacement {
  side: CompanionSide;
  /**
   * Distance from the bottom, above the floating tab bar.
   *
   * The bar is the one thing the companion must never sit on: it is how you
   * leave the screen it is standing on.
   */
  bottom: number;
  /** How far in from its side. */
  inset: number;
  size: number;
  /** Where it glances when it looks around on this tab. */
  attention: 'up' | 'in' | 'none';
  /** Read out by screen readers in place of the animation. */
  label: string;
}

/** Above the floating tab bar, with room to breathe. */
const ABOVE_TAB_BAR = 104;

/**
 * Where the companion stands on each tab.
 *
 * It never sits in the middle of anything: each tab puts it on the side that
 * the content of that tab leaves free, and always above the tab bar. The side
 * also decides which way "looking in" points, so the animal glances towards the
 * screen rather than off the edge of it.
 *
 * Keyed by the tab's route path. A screen with no entry shows no companion at
 * all – which is the right default for anything that is not a tab, the running
 * quiz above all: nothing may sit next to the answers.
 */
export const COMPANION_PLACEMENTS: Record<string, CompanionPlacement> = {
  // Quiz: beside the category grid, looking up at the round on offer.
  '/': { side: 'right', bottom: ABOVE_TAB_BAR, inset: 6, size: 124, attention: 'up', label: 'Dein Begleiter' },
  // Progress: on the left, facing the numbers.
  '/progress': { side: 'left', bottom: ABOVE_TAB_BAR, inset: 6, size: 112, attention: 'in', label: 'Dein Begleiter' },
  // Friends: out of the way of the list, which is read to its right edge.
  '/friends': { side: 'right', bottom: ABOVE_TAB_BAR, inset: 4, size: 104, attention: 'in', label: 'Dein Begleiter' },
  // More: beside the profile row at the top of the tab.
  '/more': { side: 'right', bottom: ABOVE_TAB_BAR, inset: 6, size: 108, attention: 'in', label: 'Dein Begleiter' },
};

/** The placement for a path, or null where the companion stays away. */
export function companionPlacement(pathname: string): CompanionPlacement | null {
  return COMPANION_PLACEMENTS[pathname] ?? null;
}

/**
 * Which way a glance goes on this tab.
 *
 * "in" means towards the middle of the screen, so a companion on the right
 * looks left. Without this it would spend half its glances staring off the
 * edge of the display.
 */
export function glanceState(placement: CompanionPlacement): CompanionState {
  if (placement.attention === 'none') return 'idle';
  return placement.side === 'right' ? 'lookLeft' : 'lookRight';
}
