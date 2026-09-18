import { useEffect, useRef, useState } from 'react';

/** How often the countdown redraws – fast enough for tenths near the end. */
const TICK_MS = 200;

/**
 * Milliseconds left until `deadlineAt`, counting down; null when the round is
 * untimed. `onExpire` runs exactly once, the moment it reaches zero.
 *
 * The deadline is an absolute timestamp, so the clock keeps running while the
 * explanation is on screen and cannot be reset by a re-render.
 */
export function useRoundClock(deadlineAt: number | null, onExpire: () => void): number | null {
  const [now, setNow] = useState(() => Date.now());
  const expire = useRef(onExpire);
  const fired = useRef(false);

  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadlineAt === null) return;
    fired.current = false;
    // Both the redraw and the expiry happen in the timer, never straight out of
    // the effect: a render triggered synchronously from here would fight React.
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= deadlineAt && !fired.current) {
        fired.current = true;
        expire.current();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [deadlineAt]);

  return deadlineAt === null ? null : Math.max(0, deadlineAt - now);
}

/** "0:07" – the countdown as it is shown next to the progress bar. */
export function formatClock(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
