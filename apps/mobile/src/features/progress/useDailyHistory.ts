import { useQuery } from '@tanstack/react-query';

import { fetchDailyHistory } from '@/services/api/historyApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * The last seven days, one row each.
 *
 * Loaded once for the whole analysis page: the six charts read six columns of
 * the same table, and asking per chart would be six requests for one answer.
 */
export function useDailyHistory(days = 7) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.dailyHistory, days],
    queryFn: () => fetchDailyHistory(days),
    enabled: ready,
    staleTime: 5 * 60 * 1000,
  });

  return { ...query, days: query.data ?? [] };
}
