import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { buildTrainingFocus, detectWeaknesses, rankTopics } from '@quizbyte/shared';

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

  const derived = useMemo(() => {
    const categories = rankTopics(categoryStats.data ?? []);
    // Weaknesses are judged on the specific level (subcategory/tag); categories are the fallback.
    const specific = (topicStats.data ?? []).filter((stat) => stat.kind !== 'category');
    let report = detectWeaknesses(specific);
    if (!report.hasEnoughData) {
      report = detectWeaknesses(topicStats.data ?? []);
    }
    return { categories, report, focus: buildTrainingFocus(report) };
  }, [categoryStats.data, topicStats.data]);

  return {
    isLoading: categoryStats.isLoading || topicStats.isLoading,
    isError: categoryStats.isError || topicStats.isError,
    error: categoryStats.error ?? topicStats.error,
    refetch: () => Promise.all([categoryStats.refetch(), topicStats.refetch()]),
    categories: derived.categories,
    report: derived.report,
    focus: derived.focus,
    canTrainWeaknesses: derived.report.weaknesses.length > 0,
  };
}
