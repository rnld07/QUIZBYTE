import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { submitAttempt } from '@/services/api/sessionsApi';
import type { SubmitAttemptInput } from '@/services/api/sessionsApi';
import { isNetworkError, logger, toAppError } from '@/services/errors';

interface OutboxState {
  pending: SubmitAttemptInput[];
  enqueue: (attempt: SubmitAttemptInput) => void;
  remove: (attempt: SubmitAttemptInput) => void;
}

const sameAttempt = (a: SubmitAttemptInput, b: SubmitAttemptInput): boolean =>
  a.sessionId === b.sessionId && a.questionId === b.questionId;

/**
 * Persisted queue of attempts that could not be saved (e.g. no connection during a
 * running session). Attempts are unique per session+question on the server, so
 * retries are idempotent.
 */
export const useAttemptOutbox = create<OutboxState>()(
  persist(
    (set, get) => ({
      pending: [],
      enqueue: (attempt) => {
        if (get().pending.some((existing) => sameAttempt(existing, attempt))) return;
        set({ pending: [...get().pending, attempt] });
      },
      remove: (attempt) => set({ pending: get().pending.filter((existing) => !sameAttempt(existing, attempt)) }),
    }),
    { name: 'quizbyte.attempt-outbox', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

let flushing = false;

/** Tries to deliver all pending attempts. Safe to call often. Returns true when the queue is empty. */
export async function flushAttemptOutbox(): Promise<boolean> {
  if (flushing) return useAttemptOutbox.getState().pending.length === 0;
  flushing = true;
  try {
    for (const attempt of [...useAttemptOutbox.getState().pending]) {
      try {
        await submitAttempt(attempt);
        useAttemptOutbox.getState().remove(attempt);
      } catch (error) {
        if (isNetworkError(error)) return false;
        const appError = toAppError(error);
        // Already stored (duplicate) or permanently invalid → drop it.
        if (appError.code !== 'unauthorized') {
          logger.warn('dropping outbox attempt', appError.code);
          useAttemptOutbox.getState().remove(attempt);
        } else {
          return false;
        }
      }
    }
    return useAttemptOutbox.getState().pending.length === 0;
  } finally {
    flushing = false;
  }
}
