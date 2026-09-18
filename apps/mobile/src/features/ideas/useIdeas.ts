import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchMyIdeas, submitIdea } from '@/services/api/ideasApi';
import type { IdeaArea } from '@/services/api/ideasApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/** Everything this user has submitted so far, newest first. */
export function useMyIdeas() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.myIdeas,
    queryFn: fetchMyIdeas,
    enabled: ready,
    staleTime: 30_000,
  });

  return { ...query, ideas: query.data ?? [] };
}

export interface SubmitIdeaVariables {
  area: IdeaArea;
  title: string;
  details: string;
}

/** Sends one idea and refreshes the user's own list. */
export function useSubmitIdea() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return useMutation({
    mutationFn: (variables: SubmitIdeaVariables) => submitIdea({ userId: userId as string, ...variables }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myIdeas });
    },
  });
}
