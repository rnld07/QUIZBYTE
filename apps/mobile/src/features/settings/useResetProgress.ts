import { useMutation, useQueryClient } from '@tanstack/react-query';

import { resetProgress } from '@/services/api/progressApi';

export function useResetProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetProgress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['progress'] });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
