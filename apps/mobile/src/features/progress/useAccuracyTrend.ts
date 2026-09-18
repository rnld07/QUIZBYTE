import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchAccuracyTrend } from '@/services/api/historyApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * Die Quotenlinie für einen Zeitraum.
 *
 * `keepPreviousData`, weil der Zeitraum umgeschaltet wird: ohne das fiele das
 * Diagramm bei jedem Wechsel auf seinen Ladezustand zurück, und ein Vergleich
 * zwischen zwei Zeiträumen wäre einer zwischen einem Diagramm und einer
 * leeren Fläche.
 */
export function useAccuracyTrend(days: number) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.accuracyTrend, days],
    queryFn: () => fetchAccuracyTrend(days),
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return { ...query, points: query.data ?? [] };
}
