import { useQuery } from '@tanstack/react-query';

import { fetchCategories } from '@/services/api/categoriesApi';
import { fetchCategoryQuestions } from '@/services/api/questionsApi';
import type { QuestionOutcomeFilter } from '@/services/api/questionsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * The answered questions of one category, filtered by outcome.
 * Only runs while the list is actually open.
 */
export function useCategoryQuestions(categoryId: string | null, filter: QuestionOutcomeFilter) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.categoryQuestions, categoryId, filter] as const,
    queryFn: async () => {
      const categories = await fetchCategories();
      const lookup = new Map(categories.map((category) => [category.id, category]));
      return fetchCategoryQuestions(categoryId as string, filter, lookup);
    },
    enabled: ready && Boolean(categoryId),
    staleTime: 30_000,
  });

  return { ...query, questions: query.data ?? [] };
}
