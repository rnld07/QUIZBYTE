import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { analytics } from '@/services/analytics/analytics';
import { ensureSession, onAuthStateChange } from '@/services/auth/authService';
import { getUserMessage, logger } from '@/services/errors';
import { flushAttemptOutbox } from '@/services/outbox/attemptOutbox';
import { useAuthStore } from '@/state/authStore';

/**
 * Creates/restores the (guest) session on launch and keeps the auth store in sync.
 * Also flushes queued attempts whenever the app returns to the foreground.
 */
export function useAuthBootstrap() {
  const status = useAuthStore((state) => state.status);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const setReady = useAuthStore((state) => state.setReady);
  const setError = useAuthStore((state) => state.setError);
  const setLoading = useAuthStore((state) => state.setLoading);

  const bootstrap = useCallback(async () => {
    setLoading();
    try {
      const session = await ensureSession();
      analytics.identify(session.user.id);
      setReady(session.user.id);
      analytics.track('app_opened', {});
      void flushAttemptOutbox();
    } catch (error) {
      logger.error('auth bootstrap failed', error);
      setError(getUserMessage(error));
    }
  }, [setError, setLoading, setReady]);

  useEffect(() => {
    void bootstrap();
    const unsubscribe = onAuthStateChange((session) => {
      if (session) setReady(session.user.id);
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushAttemptOutbox();
    });
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [bootstrap, setReady]);

  return { status, errorMessage, retry: bootstrap };
}
