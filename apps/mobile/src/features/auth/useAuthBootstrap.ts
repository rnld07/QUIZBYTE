import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { analytics } from '@/services/analytics/analytics';
import { accountFromUser, onAuthStateChange, restoreSession } from '@/services/auth/authService';
import { getUserMessage, logger } from '@/services/errors';
import { flushAttemptOutbox, hydrateAttemptOutbox } from '@/services/outbox/attemptOutbox';
import { useAuthStore } from '@/state/authStore';

import { resetLocalUserState } from './resetLocalUserState';

/**
 * Restores the session on launch and keeps the auth store in sync.
 *
 * No session means signed out, not "make one": QuizByte needs an account, and
 * the gate above shows the sign-in screen instead. Queued attempts are flushed
 * whenever the app comes back to the foreground.
 */
export function useAuthBootstrap() {
  const status = useAuthStore((state) => state.status);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const setReady = useAuthStore((state) => state.setReady);
  const setError = useAuthStore((state) => state.setError);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setSignedOut = useAuthStore((state) => state.setSignedOut);
  // Who the cached queries belong to. Everything TanStack Query holds – profile,
  // progress, friends – is one user's, so it has to go when the user changes.
  const cachedFor = useRef<string | null>(null);

  const adopt = useCallback(
    (userId: string, account: ReturnType<typeof accountFromUser>) => {
      // Ein anderes Konto: alles Lokale des vorigen geht weg, auch eine Runde,
      // die noch im Arbeitsspeicher stand.
      if (cachedFor.current !== null && cachedFor.current !== userId) resetLocalUserState();
      cachedFor.current = userId;
      setReady({ userId, ...account });
    },
    [setReady],
  );

  const bootstrap = useCallback(async () => {
    setLoading();
    try {
      // Die Warteschlange zuerst: sie bringt mit, was beim letzten Mal nicht
      // rausging, und uebernimmt dabei die Eintraege der alten Fassung.
      await hydrateAttemptOutbox();
      const session = await restoreSession();
      if (!session) {
        setSignedOut();
        return;
      }
      analytics.identify(session.user.id);
      adopt(session.user.id, accountFromUser(session.user));
      analytics.track('app_opened', {});
      void flushAttemptOutbox(session.user.id);
    } catch (error) {
      logger.error('auth bootstrap failed', error);
      setError(getUserMessage(error));
    }
  }, [adopt, setError, setLoading, setSignedOut]);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = onAuthStateChange((session) => {
      if (session) {
        analytics.identify(session.user.id);
        adopt(session.user.id, accountFromUser(session.user));
        void flushAttemptOutbox(session.user.id);
        return;
      }
      // Signed out: back to the sign-in screen, and everything local goes with
      // it so the next person to sign in on this device sees their own data.
      resetLocalUserState();
      cachedFor.current = null;
      setSignedOut();
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushAttemptOutbox(useAuthStore.getState().userId);
    });
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [adopt, bootstrap, setSignedOut]);

  return { status, errorMessage, retry: bootstrap };
}
