import { useQuery } from '@tanstack/react-query';

import { countWrongQuestions } from '@/services/api/questionsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/** Number of wrongly answered questions available for a replay session. */
export function useWrongQuestionCount() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.wrongQuestions,
    queryFn: countWrongQuestions,
    enabled: ready,
    staleTime: 30_000,
  });

  return { ...query, count: query.data ?? 0 };
}
