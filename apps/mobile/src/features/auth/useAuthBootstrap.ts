import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { analytics } from '@/services/analytics/analytics';
import { accountFromUser, onAuthStateChange, restoreSession } from '@/services/auth/authService';
import { getUserMessage, logger } from '@/services/errors';
import { flushAttemptOutbox } from '@/services/outbox/attemptOutbox';
import { queryClient } from '@/services/query/queryClient';
import { useAuthStore } from '@/state/authStore';

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
      if (cachedFor.current !== null && cachedFor.current !== userId) queryClient.clear();
      cachedFor.current = userId;
      setReady({ userId, ...account });
    },
    [setReady],
  );

  const bootstrap = useCallback(async () => {
    setLoading();
    try {
      const session = await restoreSession();
      if (!session) {
        setSignedOut();
        return;
      }
      analytics.identify(session.user.id);
      adopt(session.user.id, accountFromUser(session.user));
      analytics.track('app_opened', {});
      void flushAttemptOutbox();
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
        void flushAttemptOutbox();
        return;
      }
      // Signed out: back to the sign-in screen, and the cache goes with it so
      // the next person to sign in on this device sees their own data.
      queryClient.clear();
      cachedFor.current = null;
      setSignedOut();
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushAttemptOutbox();
    });
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [adopt, bootstrap, setSignedOut]);

  return { status, errorMessage, retry: bootstrap };
}
