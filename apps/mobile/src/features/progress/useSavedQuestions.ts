import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchCategories } from '@/services/api/categoriesApi';
import { fetchSavedQuestionIds, fetchSavedQuestions, saveQuestion, unsaveQuestion } from '@/services/api/questionsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

const MAX_SAVED = 200;

/** The questions the user bookmarked, most recently saved first. */
export function useSavedQuestions() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.savedQuestions,
    queryFn: async () => {
      const categories = await fetchCategories();
      const lookup = new Map(categories.map((category) => [category.id, category]));
      return fetchSavedQuestions(MAX_SAVED, lookup);
    },
    enabled: ready,
    staleTime: 30_000,
  });

  return { ...query, questions: query.data ?? [] };
}

/**
 * Which of the given questions are bookmarked – enough to draw the icon in the
 * quiz without pulling the whole list.
 */
export function useSavedQuestionIds(questionIds: string[]) {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.savedQuestionIds, ...questionIds],
    queryFn: () => fetchSavedQuestionIds(questionIds),
    enabled: ready && questionIds.length > 0,
    staleTime: 30_000,
  });

  return new Set(query.data ?? []);
}

/** Adds or removes one bookmark. */
export function useToggleSavedQuestion() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return useMutation({
    mutationFn: ({ questionId, saved }: { questionId: string; saved: boolean }) =>
      saved ? saveQuestion(userId as string, questionId) : unsaveQuestion(userId as string, questionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedQuestions });
    },
  });
}
