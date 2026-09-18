/**
 * The companion's repertoire.
 *
 * One list, shared by the app and by whoever draws the animations: these names
 * are the contract with the Rive file, so renaming one here means renaming a
 * state in the artwork as well. Add new ones rather than repurposing old ones.
 */
export const COMPANION_STATES = [
  'idle',
  'blink',
  'lookLeft',
  'lookRight',
  'happy',
  'sad',
  'celebrate',
  'sleep',
] as const;

export type CompanionState = (typeof COMPANION_STATES)[number];

export interface CompanionStateMeta {
  /**
   * How long it plays before the companion falls back to idle, in ms.
   *
   * `null` means it holds until something else replaces it – idle and sleep are
   * where the companion waits, not things it performs.
   */
  durationMs: number | null;
  /**
   * Who wins when two things happen at once.
   *
   * The idle fidgets sit at the bottom: a blink must never cut off the
   * celebration for a level-up, and an answer landing mid-blink should take
   * over immediately.
   */
  priority: number;
}

export const COMPANION_STATE_META: Record<CompanionState, CompanionStateMeta> = {
  idle: { durationMs: null, priority: 0 },
  blink: { durationMs: 320, priority: 1 },
  lookLeft: { durationMs: 1400, priority: 1 },
  lookRight: { durationMs: 1400, priority: 1 },
  happy: { durationMs: 1600, priority: 2 },
  sad: { durationMs: 1600, priority: 2 },
  celebrate: { durationMs: 2600, priority: 3 },
  sleep: { durationMs: null, priority: 1 },
};

/** True for the states the companion performs and then leaves behind. */
export function isTransientCompanionState(state: CompanionState): boolean {
  return COMPANION_STATE_META[state].durationMs !== null;
}

/**
 * Whether `next` may interrupt `current`.
 *
 * Equal priority replaces: two answers in a row should each be reacted to, and
 * the second reaction is the one that matches what just happened.
 */
export function canInterruptCompanionState(current: CompanionState, next: CompanionState): boolean {
  return COMPANION_STATE_META[next].priority >= COMPANION_STATE_META[current].priority;
}

/** Narrowing for values that crossed a boundary – a stored id, a trigger call. */
export function isCompanionState(value: unknown): value is CompanionState {
  return typeof value === 'string' && (COMPANION_STATES as readonly string[]).includes(value);
}
