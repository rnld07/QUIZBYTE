import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryKeys';
import { fetchAnswerStats } from '@/services/api/progressApi';
import { useAuthStore } from '@/state/authStore';

/**
 * Answered questions and hits, counted once per question.
 *
 * `user_progress` keeps raw per-answer counters for XP and streak; those would
 * grow with every repeat, which is why the screens read this instead.
 */
export function useAnswerStats() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.answerStats,
    queryFn: fetchAnswerStats,
    enabled: ready,
    staleTime: 30_000,
  });

  return { ...query, answered: query.data?.answered ?? 0, correct: query.data?.correct ?? 0 };
}
