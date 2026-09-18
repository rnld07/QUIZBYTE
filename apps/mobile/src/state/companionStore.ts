import { create } from 'zustand';

import { canInterruptCompanionState, isTransientCompanionState } from '@quizbyte/shared';
import type { CompanionState } from '@quizbyte/shared';

interface CompanionStoreState {
  /** What the companion is doing right now. */
  state: CompanionState;
  /**
   * Counts every state change, replays included.
   *
   * Two happy answers in a row are the same state twice, and a renderer that
   * only watched `state` would play the second one not at all. The cue is what
   * the views actually key their animation on.
   */
  cue: number;
  /** When something last happened that counts as the user being there. */
  lastInteractionAt: number;
  /**
   * Asks for a state. Ignored when something more important is playing – see
   * `canInterruptCompanionState`.
   */
  trigger: (next: CompanionState) => void;
  /** Back to the resting state, once a performance has played out. */
  settle: () => void;
  /** Wakes the companion and restarts the clock that sends it to sleep. */
  noteInteraction: () => void;
}

/**
 * What the companion is doing, for everyone who needs to know.
 *
 * A store rather than context state: the quiz controller reacts to an answer
 * without being anywhere near the component tree that draws the animal, and
 * the screens around it must not re-render because a cat blinked.
 */
export const useCompanionStore = create<CompanionStoreState>()((set, get) => ({
  state: 'idle',
  cue: 0,
  lastInteractionAt: Date.now(),

  trigger: (next) => {
    const current = get().state;
    if (!canInterruptCompanionState(current, next)) return;

    set((store) => ({
      state: next,
      cue: store.cue + 1,
      // Fidgets are the companion amusing itself; they are not the user being
      // there, and must not keep it from ever falling asleep.
      lastInteractionAt: isIdleFidget(next) ? store.lastInteractionAt : Date.now(),
    }));
  },

  settle: () => {
    // Only a performance settles. Idle and sleep are where it already rests,
    // and settling those would restart the engine for nothing.
    if (!isTransientCompanionState(get().state)) return;
    set((store) => ({ state: 'idle', cue: store.cue + 1 }));
  },

  noteInteraction: () => {
    const store = get();
    set({ lastInteractionAt: Date.now() });
    // Being woken is itself a state change – a sleeping animal has to open its
    // eyes before it can go back to idling.
    if (store.state === 'sleep') set({ state: 'idle', cue: store.cue + 1 });
  },
}));

/** The small things it does on its own, as opposed to reactions to the user. */
function isIdleFidget(state: CompanionState): boolean {
  return state === 'blink' || state === 'lookLeft' || state === 'lookRight' || state === 'idle';
}

/**
 * Plays an animation on the companion, from anywhere.
 *
 * Deliberately a plain function and not a hook: the callers are event handlers
 * deep in the quiz flow, and none of them should have to subscribe to anything
 * to say "that answer was right".
 */
export function triggerAvatarAnimation(state: CompanionState): void {
  useCompanionStore.getState().trigger(state);
}

/** Tells the companion the user is around – a tap, a tab change, a new screen. */
export function noteCompanionInteraction(): void {
  useCompanionStore.getState().noteInteraction();
}
