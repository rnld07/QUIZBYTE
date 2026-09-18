import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { COMPANION_STATE_META, nextIdleAction } from '@quizbyte/shared';

import { useCompanionStore } from '@/state/companionStore';
import { useSettingsStore } from '@/state/settingsStore';

interface CompanionProviderProps {
  children: React.ReactNode;
}

/**
 * The companion's clock.
 *
 * One timer for the whole app, living above the navigation tree so it keeps
 * running while screens come and go – the alternative, a timer per screen that
 * shows the animal, is how you end up with four cats blinking out of step.
 *
 * It does two things and nothing else: end a performance once it has played,
 * and, while the companion is resting, decide what small thing it does next.
 * Which animal it is, where it stands and what it looks like are all somebody
 * else's business.
 */
export function CompanionProvider({ children }: CompanionProviderProps) {
  const state = useCompanionStore((store) => store.state);
  const cue = useCompanionStore((store) => store.cue);
  const enabled = useSettingsStore((store) => store.companionEnabled);
  const [foreground, setForeground] = useState(() => AppState.currentState === 'active');

  /*
    Nothing ticks while the app is away.

    Timers keep firing in the background, and a companion that blinked its way
    through a night in someone's pocket is a battery drain with a face on it.
    Coming back counts as the user being there, which is also what wakes it.
  */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      const active = status === 'active';
      setForeground(active);
      if (active) useCompanionStore.getState().noteInteraction();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !foreground) return;

    // A performance: let it play, then rest.
    const durationMs = COMPANION_STATE_META[state].durationMs;
    if (durationMs !== null) {
      const timer = setTimeout(() => useCompanionStore.getState().settle(), durationMs);
      return () => clearTimeout(timer);
    }

    // Asleep there is nothing to schedule: waking up is somebody else's doing,
    // and a timer firing at a sleeping animal is a timer for nothing.
    if (state === 'sleep') return;

    const since = Date.now() - useCompanionStore.getState().lastInteractionAt;
    const action = nextIdleAction(since, Math.random);
    const timer = setTimeout(() => useCompanionStore.getState().trigger(action.state), action.delayMs);
    return () => clearTimeout(timer);
    // `cue` is what makes the same state twice schedule twice – see the store.
  }, [cue, enabled, foreground, state]);

  return children;
}
