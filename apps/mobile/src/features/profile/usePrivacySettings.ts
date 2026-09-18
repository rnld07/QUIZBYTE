import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setPrivacySettings } from '@/services/api/accountApi';
import { queryKeys } from '@/services/api/queryKeys';

export interface PrivacySettings {
  searchable: boolean;
  allowFriendRequests: boolean;
}

/**
 * The two privacy switches.
 *
 * They live on the profile, so there is nothing to load – whoever shows them
 * already has it. Only writing needs a hook, and it sends both values every
 * time: two switches are one setting with two halves, and sending one of them
 * would leave the server guessing about the other.
 */
export function useSetPrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchable, allowFriendRequests }: PrivacySettings) =>
      setPrivacySettings(searchable, allowFriendRequests),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
