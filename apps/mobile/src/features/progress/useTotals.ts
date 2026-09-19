import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchTotals } from '@/services/api/historyApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * Die Zahlen unter "Insgesamt", für den gewählten Zeitraum.
 *
 * `keepPreviousData`, weil der Zeitraum umgeschaltet wird: ohne das fielen alle
 * sechs Kacheln bei jedem Wechsel kurz auf ihren Ladezustand zurück, und ein
 * Vergleich zwischen zwei Zeiträumen wäre einer gegen leere Felder.
 */
export function useTotals(days: number | null) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.totals, days ?? 'all'],
    queryFn: () => fetchTotals(days),
    enabled: ready,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return { ...query, totals: query.data ?? null };
}
