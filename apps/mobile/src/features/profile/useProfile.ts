import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Profile } from '@quizbyte/shared';

import { fetchProfile, updateProfile } from '@/services/api/profileApi';
import type { UpdateProfileInput } from '@/services/api/profileApi';
import { queryKeys } from '@/services/api/queryKeys';
import { analytics } from '@/services/analytics/analytics';
import { useAuthStore } from '@/state/authStore';

export function useProfile() {
  const userId = useAuthStore((state) => state.userId);
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  return useMutation({
    mutationFn: (input: Omit<UpdateProfileInput, 'userId'>) => updateProfile({ ...input, userId: userId as string }),
    onSuccess: (profile: Profile, input) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      if (input.username !== undefined) analytics.track('profile_updated', { field: 'username' });
      if (input.displayName !== undefined) analytics.track('profile_updated', { field: 'display_name' });
    },
  });
}
