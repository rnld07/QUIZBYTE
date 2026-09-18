import { useQuery } from '@tanstack/react-query';

import { fetchPerfectSessions } from '@/services/api/progressApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/** How many rounds were finished without a single wrong answer. */
export function usePerfectSessions() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.perfectSessions,
    queryFn: fetchPerfectSessions,
    enabled: ready,
    staleTime: 60_000,
  });

  return { ...query, count: query.data ?? 0 };
}
