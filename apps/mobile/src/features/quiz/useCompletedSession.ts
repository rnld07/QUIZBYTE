import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import { restoreCompletedSession } from '@/services/api/sessionsApi';
import { useAuthStore } from '@/state/authStore';

/**
 * Loads a finished round from the server. Used by the result screen when the
 * in-memory session is gone – after an app restart, for example.
 */
export function useCompletedSession(sessionId: string | null, enabled = true) {
  const userId = useAuthStore((state) => state.userId);

  const query = useQuery({
    queryKey: [...queryKeys.completedSession, sessionId] as const,
    queryFn: () => restoreCompletedSession(sessionId as string, userId as string),
    enabled: enabled && Boolean(sessionId) && Boolean(userId),
    staleTime: 60_000,
  });

  return { ...query, session: query.data ?? null };
}
