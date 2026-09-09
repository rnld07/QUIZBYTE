import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { isNetworkError } from '@/services/errors';

/** App-wide TanStack Query client. Server data lives here, UI state in Zustand. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && isNetworkError(error),
      staleTime: 30_000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Treat "app in foreground" as window focus so stale data refreshes on return.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}
