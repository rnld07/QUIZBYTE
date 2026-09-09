import { useQuery } from '@tanstack/react-query';

import { fetchCategories } from '@/services/api/categoriesApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

export function useCategories() {
  const ready = useAuthStore((state) => state.status === 'ready');
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    enabled: ready,
    staleTime: 5 * 60 * 1000,
  });
}
