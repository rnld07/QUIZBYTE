import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchHistory } from '@/services/api/historyApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * Der Verlauf für einen Zeitraum – die Daten hinter dem Fenster, das eine
 * Kachel öffnet.
 *
 * `days = null` steht für "Gesamt" und wird hier zu einem Jahr: "seit Beginn"
 * hat kein Ende, ein Diagramm aber schon, und zwölf Monatssäulen sind das
 * Längste, was sich noch lesen lässt.
 */
export function useHistory(days: number | null) {
  const ready = useAuthStore((state) => state.status === 'ready');
  const range = days ?? 365;

  const query = useQuery({
    queryKey: [...queryKeys.dailyHistory, range],
    queryFn: () => fetchHistory(range),
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return { ...query, days: query.data ?? [] };
}
