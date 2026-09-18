import type { CompanionState } from './states';

/** Shortest and longest pause between two idle fidgets, in ms. */
export const IDLE_MIN_DELAY_MS = 3_500;
export const IDLE_MAX_DELAY_MS = 9_000;

/** How long nothing may happen before the companion nods off. */
export const SLEEP_AFTER_MS = 90_000;

/** What an idle fidget is, and how often it comes up. */
const IDLE_FIDGETS: readonly { state: CompanionState; weight: number }[] = [
  // Blinking carries the impression of being alive; the rest is seasoning.
  { state: 'blink', weight: 55 },
  { state: 'lookLeft', weight: 20 },
  { state: 'lookRight', weight: 20 },
  // Occasionally it just keeps still. Without this the companion fidgets on a
  // metronome, which is exactly what makes a character feel mechanical.
  { state: 'idle', weight: 5 },
];

const TOTAL_WEIGHT = IDLE_FIDGETS.reduce((sum, fidget) => sum + fidget.weight, 0);

export interface IdleAction {
  state: CompanionState;
  /** How long to wait before asking again. */
  delayMs: number;
}

/**
 * The next small thing the companion does while nothing else is going on.
 *
 * Pure, and handed its own randomness, so the pacing can be tested instead of
 * watched: given the same numbers it always picks the same fidget.
 *
 * After a long enough silence it stops fidgeting and sleeps – a character that
 * keeps blinking at an untouched screen is a battery drain with a face on it.
 * Sleep holds until something wakes it, so the caller is not asked again.
 */
export function nextIdleAction(msSinceInteraction: number, random: () => number): IdleAction {
  if (msSinceInteraction >= SLEEP_AFTER_MS) return { state: 'sleep', delayMs: SLEEP_AFTER_MS };

  const roll = clamp01(random()) * TOTAL_WEIGHT;
  let seen = 0;
  let picked: CompanionState = 'blink';
  for (const fidget of IDLE_FIDGETS) {
    seen += fidget.weight;
    if (roll < seen) {
      picked = fidget.state;
      break;
    }
  }

  const spread = IDLE_MAX_DELAY_MS - IDLE_MIN_DELAY_MS;
  const delayMs = Math.round(IDLE_MIN_DELAY_MS + clamp01(random()) * spread);

  // Never overshoot the moment it should be asleep: without this a fidget drawn
  // just before the threshold would hold the companion awake past it.
  const untilSleep = Math.max(0, SLEEP_AFTER_MS - msSinceInteraction);
  return { state: picked, delayMs: Math.min(delayMs, untilSleep) };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999, Math.max(0, value));
}
