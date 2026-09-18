import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import { EMPTY_MODE_RECORD, fetchModeRecords } from '@/services/api/progressApi';
import type { ModeRecord } from '@/services/api/progressApi';
import { useAuthStore } from '@/state/authStore';

/**
 * Personal bests per mode, with the given round left out of the comparison –
 * that is what lets a result screen say "neuer Rekord" instead of just showing
 * the number the round itself set.
 */
export function useModeRecords(excludeSessionId?: string | null) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.modeRecords, excludeSessionId ?? 'all'],
    queryFn: () => fetchModeRecords(excludeSessionId),
    enabled: ready,
    staleTime: 30_000,
  });

  return {
    ...query,
    /** The record for one mode; all zeroes while nothing has been played. */
    recordFor: (mode: string): ModeRecord => query.data?.[mode] ?? EMPTY_MODE_RECORD,
  };
}
