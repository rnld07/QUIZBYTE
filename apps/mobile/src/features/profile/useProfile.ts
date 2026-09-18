import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AvatarConfig, Profile } from '@quizbyte/shared';

import { fetchProfile, setProfileFrame, updateAvatarConfig, updateProfile } from '@/services/api/profileApi';
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

/** Saves the pet the user put together. Friends see it too, so their lists go stale. */
export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  return useMutation({
    mutationFn: (config: AvatarConfig) => updateAvatarConfig(userId as string, config),
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
      analytics.track('profile_updated', { field: 'avatar' });
    },
  });
}

/**
 * Equips a profile frame (or takes it off with `null`).
 *
 * Applied to the cache before the request goes out: waiting for the round-trip
 * and the refetch made the whole profile – hero avatar and all previews –
 * re-render a moment later, which read as a stutter. On failure the previous
 * frame is put back.
 */
export function useSetProfileFrame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (frameId: string | null) => setProfileFrame(frameId),
    onMutate: async (frameId: string | null) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });
      const previous = queryClient.getQueryData<Profile>(queryKeys.profile);
      if (previous) queryClient.setQueryData<Profile>(queryKeys.profile, { ...previous, selectedFrame: frameId });
      return { previous };
    },
    onError: (_error, _frameId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.profile, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      // Friends see the frame too, so their lists are stale now.
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
    },
  });
}
