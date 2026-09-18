import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { buildTrainingFocus, detectWeaknesses, mergeCategoryProgress } from '@quizbyte/shared';

import { useCategories } from '@/features/quiz/useCategories';
import { fetchCategoryStats, fetchTopicStats } from '@/services/api/progressApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/** Category performance + weakness/strength detection for the progress tab. */
export function useStats() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const categoryStats = useQuery({
    queryKey: queryKeys.categoryStats,
    queryFn: fetchCategoryStats,
    enabled: ready,
    staleTime: 30_000,
  });

  const topicStats = useQuery({
    queryKey: queryKeys.topicStats,
    queryFn: fetchTopicStats,
    enabled: ready,
    staleTime: 30_000,
  });

  // Every active category – the progress list shows unplayed ones too.
  const allCategories = useCategories();

  const derived = useMemo(() => {
    // Weaknesses are judged on the specific level (subcategory/tag); categories are the fallback.
    const specific = (topicStats.data ?? []).filter((stat) => stat.kind !== 'category');
    let report = detectWeaknesses(specific);
    if (!report.hasEnoughData) {
      report = detectWeaknesses(topicStats.data ?? []);
    }
    const allWithProgress = mergeCategoryProgress(allCategories.data ?? [], categoryStats.data ?? []);
    return { allWithProgress, report, focus: buildTrainingFocus(report) };
  }, [allCategories.data, categoryStats.data, topicStats.data]);

  return {
    isLoading: categoryStats.isLoading || topicStats.isLoading || allCategories.isLoading,
    isError: categoryStats.isError || topicStats.isError,
    error: categoryStats.error ?? topicStats.error,
    refetch: () => Promise.all([categoryStats.refetch(), topicStats.refetch(), allCategories.refetch()]),
    /** Every active category, played ones first. */
    allCategories: derived.allWithProgress,
    report: derived.report,
    focus: derived.focus,
    canTrainWeaknesses: derived.report.weaknesses.length > 0,
  };
}
