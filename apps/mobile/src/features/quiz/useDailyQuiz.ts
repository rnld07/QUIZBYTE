import { useQuery } from '@tanstack/react-query';

import { toLocalDateString } from '@quizbyte/shared';

import { queryKeys } from '@/services/api/queryKeys';
import { fetchDailyResultToday, fetchDailySessionToday } from '@/services/api/sessionsApi';
import { useAuthStore } from '@/state/authStore';

/** Today's daily round: whether it is done, and which session it was. */
export function useDailyQuizStatus() {
  const ready = useAuthStore((state) => state.status === 'ready');
  // The server decides the quiz day (Europe/Berlin); the local date only keys
  // the cache so it turns over at roughly the right time.
  const today = toLocalDateString();

  const query = useQuery({
    queryKey: [...queryKeys.dailyQuiz, today] as const,
    queryFn: fetchDailySessionToday,
    enabled: ready,
    staleTime: 60_000,
  });

  return { ...query, sessionId: query.data ?? null, done: Boolean(query.data) };
}

/**
 * The score of today's paying daily round. Used by the result screen when the
 * round on show is a repeat and therefore earned nothing itself.
 */
export function useDailyResultToday(enabled: boolean) {
  const ready = useAuthStore((state) => state.status === 'ready');
  const today = toLocalDateString();

  const query = useQuery({
    queryKey: [...queryKeys.dailyQuiz, 'result', today] as const,
    queryFn: fetchDailyResultToday,
    enabled: ready && enabled,
    staleTime: 60_000,
  });

  return query.data ?? null;
}
