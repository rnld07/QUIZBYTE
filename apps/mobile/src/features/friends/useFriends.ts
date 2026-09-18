import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { AnswerKey, QuizMode } from '@quizbyte/shared';

import {
  answerSharedQuestion,
  createDuel,
  declineDuel,
  fetchConversation,
  fetchFriendProfile,
  fetchFriendRequests,
  fetchFriends,
  fetchUnreadCounts,
  markConversationRead,
  removeFriend,
  respondFriendRequest,
  searchUsers,
  sendFriendRequest,
  sendQuestionToFriend,
  fetchFriendModeRecords,
  fetchDuelRecord,
  fetchDuel,
  fetchMyDuelCount,
  settleDuel,
} from '@/services/api/friendsApi';
import { EMPTY_MODE_RECORD } from '@/services/api/progressApi';
import type { ModeRecord } from '@/services/api/progressApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/** My confirmed friends. */
export function useFriends() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.friends,
    queryFn: fetchFriends,
    enabled: ready,
    staleTime: 30_000,
  });

  return { ...query, friends: query.data ?? [] };
}

/** Incoming requests waiting for my answer. */
export function useFriendRequests() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: queryKeys.friendRequests,
    queryFn: fetchFriendRequests,
    enabled: ready,
    staleTime: 30_000,
  });

  return { ...query, requests: query.data ?? [] };
}

/** Username search. Stays idle until the term is long enough to be useful. */
export function useUserSearch(term: string) {
  const ready = useAuthStore((state) => state.status === 'ready');
  const trimmed = term.trim();

  const query = useQuery({
    queryKey: [...queryKeys.userSearch, trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: ready && trimmed.length >= 2,
    staleTime: 15_000,
  });

  return { ...query, results: query.data ?? [], tooShort: trimmed.length < 2 };
}

/** Everything that changes the friend list invalidates the same three queries. */
function useFriendMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
      void queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userSearch });
    },
  });
}

export function useSendFriendRequest() {
  return useFriendMutation((userId: string) => sendFriendRequest(userId));
}

export function useRespondFriendRequest() {
  return useFriendMutation(({ id, accept }: { id: string; accept: boolean }) => respondFriendRequest(id, accept));
}

export function useRemoveFriend() {
  return useFriendMutation((userId: string) => removeFriend(userId));
}

export function useFriendProfile(userId: string | null) {
  const query = useQuery({
    queryKey: [...queryKeys.friendProfile, userId],
    queryFn: () => fetchFriendProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  return { ...query, profile: query.data ?? null };
}

/**
 * A friend's personal bests per mode.
 *
 * Its own query rather than part of the profile: the bests are a scan over
 * every round that player ever finished, and the profile above them should not
 * wait on it.
 */
export function useFriendModeRecords(userId: string | null) {
  const query = useQuery({
    queryKey: [...queryKeys.friendProfile, userId, 'records'],
    queryFn: () => fetchFriendModeRecords(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  return {
    ...query,
    recordFor: (mode: string): ModeRecord => query.data?.[mode] ?? EMPTY_MODE_RECORD,
  };
}

/**
 * One duel, polled while it is still open.
 *
 * The result screen of a duel round sits there waiting for the other player,
 * so it asks again every few seconds – and stops once the duel is settled,
 * because nothing about it can change after that.
 */
export function useDuel(duelId: string | null) {
  const query = useQuery({
    queryKey: [...queryKeys.duel, duelId],
    /*
      Settled before it is read. Somebody has to ask for the scoring once both
      players are done, and while this page is the one waiting, it may as well
      be this one. The call returns at once when there is nothing to settle.
    */
    queryFn: async () => {
      await settleDuel(duelId as string).catch(() => undefined);
      return fetchDuel(duelId as string);
    },
    enabled: Boolean(duelId),
    staleTime: 5_000,
    refetchInterval: (query) => (query.state.data?.status === 'finished' ? false : 10_000),
  });

  return { ...query, duel: query.data ?? null };
}

/** How many duels I have finished in total. */
export function useMyDuelCount() {
  const ready = useAuthStore((state) => state.status === 'ready');

  const query = useQuery({
    queryKey: [...queryKeys.duel, 'count'],
    queryFn: fetchMyDuelCount,
    enabled: ready,
    staleTime: 60_000,
  });

  return { ...query, count: query.data ?? 0 };
}

/** The head-to-head record against one friend. */
export function useDuelRecord(userId: string | null) {
  const query = useQuery({
    queryKey: [...queryKeys.friendProfile, userId, 'duels'],
    queryFn: () => fetchDuelRecord(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  return { ...query, record: query.data ?? null };
}

/** The chat with one friend. */
export function useConversation(friendId: string | null) {
  const query = useQuery({
    queryKey: [...queryKeys.conversation, friendId],
    queryFn: () => fetchConversation(friendId as string),
    enabled: Boolean(friendId),
    // No realtime yet: a short staleness keeps a chat that is open reasonably
    // current without hammering the server.
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  return { ...query, messages: query.data ?? [] };
}

/**
 * How many unread messages wait in each chat.
 *
 * Polled like the conversation itself – there is no push channel yet, and a
 * badge that only appears when you happen to reopen the tab is worse than one
 * that is a few seconds late.
 */
export function useUnreadCounts() {
  const ready = useAuthStore((state) => state.status === 'ready');
  const query = useQuery({
    queryKey: queryKeys.unreadMessages,
    queryFn: fetchUnreadCounts,
    enabled: ready,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const counts = query.data ?? {};
  return { counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
}

/**
 * Marks a chat read when it is opened.
 *
 * Fires once per chat rather than on every message: the timestamp is what is
 * stored, so writing it again would say the same thing.
 */
export function useMarkConversationRead(friendId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!friendId) return;
    void markConversationRead(friendId)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.unreadMessages }))
      // A badge that stays up is a small thing; an error dialog over a chat
      // the user just opened is not.
      .catch(() => undefined);
  }, [friendId, queryClient]);
}

/** Anything that changes a conversation refreshes it afterwards. */
function useConversationMutation<TVariables>(friendId: string | null, mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.conversation, friendId] });
    },
  });
}

export function useSendQuestion(friendId: string | null) {
  return useConversationMutation(friendId, (questionId: string) => sendQuestionToFriend(friendId as string, questionId));
}

/**
 * Sends a question to whichever friend is picked.
 *
 * The friend is part of the call rather than of the hook, because this is used
 * from the quiz – where there is no chat open and no friend chosen yet.
 */
export function useShareQuestionWithFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ friendId, questionId }: { friendId: string; questionId: string }) =>
      sendQuestionToFriend(friendId, questionId),
    onSuccess: (_result, { friendId }) => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.conversation, friendId] });
    },
  });
}

export function useAnswerSharedQuestion(friendId: string | null) {
  return useConversationMutation(friendId, ({ messageId, answer }: { messageId: string; answer: AnswerKey }) =>
    answerSharedQuestion(messageId, answer),
  );
}

export function useCreateDuel(friendId: string | null) {
  return useConversationMutation(friendId, (mode: QuizMode) => createDuel(friendId as string, mode));
}

export function useDeclineDuel(friendId: string | null) {
  return useConversationMutation(friendId, (duelId: string) => declineDuel(duelId));
}
