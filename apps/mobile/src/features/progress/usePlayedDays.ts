import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchPlayedDays } from '@/services/api/historyApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * Die gespielten Tage eines Zeitraums.
 *
 * Nur geladen, wenn das Kalendergitter offen ist (`enabled`) – für die Säulen
 * ist die Frage "an welchem Tag genau" gar nicht gestellt.
 */
export function usePlayedDays(days: number | null, enabled: boolean) {
  const ready = useAuthStore((state) => state.status === 'ready');
  const range = days ?? 365;

  const query = useQuery({
    queryKey: [...queryKeys.playedDays, range],
    queryFn: () => fetchPlayedDays(range),
    enabled: ready && enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return { ...query, playedDays: query.data ?? new Set<string>() };
}
