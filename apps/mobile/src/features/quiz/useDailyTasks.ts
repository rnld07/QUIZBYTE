import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unclaimedDailyTaskXp } from '@quizbyte/shared';
import type { DailyTaskKey } from '@quizbyte/shared';

import { claimDailyTask, fetchDailyTasks, fetchDailyWheel, spinDailyWheel } from '@/services/api/dailyApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useAuthStore } from '@/state/authStore';

/**
 * The three tasks of the day.
 *
 * Refetched whenever a round ends – the progress is read out of the day's
 * attempts, so it only moves when something has been played.
 */
export function useDailyTasks() {
  const ready = useAuthStore((state) => state.status === 'ready');
  const query = useQuery({
    queryKey: queryKeys.dailyTasks,
    queryFn: fetchDailyTasks,
    enabled: ready,
    staleTime: 30_000,
  });

  const tasks = query.data ?? [];
  return {
    ...query,
    tasks,
    /** XP lying there to be collected – what the section badge counts. */
    waitingXp: unclaimedDailyTaskXp(tasks),
  };
}

export function useClaimDailyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: DailyTaskKey) => claimDailyTask(key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dailyTasks });
      // The XP landed on the server; the level in the header is now behind.
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}

export function useDailyWheel() {
  const ready = useAuthStore((state) => state.status === 'ready');
  const query = useQuery({
    queryKey: queryKeys.dailyWheel,
    queryFn: fetchDailyWheel,
    enabled: ready,
    staleTime: 30_000,
  });

  return { ...query, wheel: query.data ?? null };
}

export function useSpinDailyWheel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: spinDailyWheel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dailyWheel });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}
