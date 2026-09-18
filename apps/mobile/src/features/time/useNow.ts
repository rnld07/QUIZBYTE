import { useEffect, useState } from 'react';

/** A minute is as fine as any countdown in the app needs to be. */
const DEFAULT_INTERVAL_MS = 60_000;

/**
 * The current time, as state.
 *
 * Reading `Date.now()` straight in a render body gives a value that changes
 * whenever the component happens to re-render – so a countdown ticks on a
 * keystroke somewhere else and stands still otherwise. Here it is state with a
 * timer behind it: it changes when time passes, and only then.
 */
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
