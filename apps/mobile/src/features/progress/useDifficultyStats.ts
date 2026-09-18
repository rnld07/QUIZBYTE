import { useQuery } from '@tanstack/react-query';

import { fetchCategoryDifficultyStats, fetchDifficultyStats } from '@/services/api/progressApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/** Accuracy per difficulty level – used by the detailed analysis. */
export function useDifficultyStats(enabled = true) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.difficultyStats,
    queryFn: fetchDifficultyStats,
    enabled: ready && enabled,
    staleTime: 30_000,
  });

  return { ...query, stats: query.data ?? [] };
}

/** Accuracy per difficulty level inside one category. */
export function useCategoryDifficultyStats(categoryId: string | null) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.difficultyStats, categoryId] as const,
    queryFn: () => fetchCategoryDifficultyStats(categoryId as string),
    enabled: ready && Boolean(categoryId),
    staleTime: 30_000,
  });

  return { ...query, stats: query.data ?? [] };
}
