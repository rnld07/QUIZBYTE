import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { blockUser, fetchBlockedUsers, reportUser, unblockUser } from '@/services/api/moderationApi';
import type { ReportUserInput } from '@/services/api/moderationApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * Reports a player.
 *
 * Nothing is invalidated afterwards: a report changes nothing the reporter can
 * see, which is the point – the person reported is not told, and no list in the
 * app grows a row.
 */
export function useReportUser() {
  return useMutation({
    mutationFn: (input: Omit<ReportUserInput, 'reporterId'>) => {
      const reporterId = useAuthStore.getState().userId;
      if (!reporterId) throw new Error('not signed in');
      return reportUser({ ...input, reporterId });
    },
  });
}

/**
 * Blocks or unblocks a player.
 *
 * Blocking drops the friendship on the server, so everything built on it has to
 * be refetched: the list, the requests, the unread counts and the profile that
 * was open when the button was pressed.
 */
export function useBlockUser() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
    void queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests });
    void queryClient.invalidateQueries({ queryKey: queryKeys.friendProfile });
    void queryClient.invalidateQueries({ queryKey: queryKeys.userSearch });
    void queryClient.invalidateQueries({ queryKey: queryKeys.unreadMessages });
    void queryClient.invalidateQueries({ queryKey: queryKeys.blocks });
  };

  const block = useMutation({ mutationFn: blockUser, onSuccess: invalidate });
  const unblock = useMutation({ mutationFn: unblockUser, onSuccess: invalidate });

  return { block, unblock };
}

/** Everyone I have blocked. */
export function useBlockedUsers() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.blocks,
    queryFn: fetchBlockedUsers,
    enabled: ready,
    staleTime: 60_000,
  });

  return { ...query, blocked: query.data ?? [] };
}
