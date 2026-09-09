import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { computeLevelProgress, effectiveStreak, toLocalDateString } from '@quizbyte/shared';

import { fetchProgress } from '@/services/api/progressApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/** User progress plus derived level information. */
export function useProgress() {
  const userId = useAuthStore((state) => state.userId);
  const query = useQuery({
    queryKey: queryKeys.progress,
    queryFn: () => fetchProgress(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const derived = useMemo(() => {
    if (!query.data) return null;
    const level = computeLevelProgress(query.data.totalXp);
    const streak = effectiveStreak(query.data, toLocalDateString());
    return { level, streak };
  }, [query.data]);

  return { ...query, progress: query.data ?? null, level: derived?.level ?? null, streak: derived?.streak ?? 0 };
}
