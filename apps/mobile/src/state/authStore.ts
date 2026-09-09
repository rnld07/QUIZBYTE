import { create } from 'zustand';

export type AuthStatus = 'loading' | 'ready' | 'error';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  errorMessage: string | null;
  setReady: (userId: string) => void;
  setError: (message: string) => void;
  setLoading: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  userId: null,
  errorMessage: null,
  setReady: (userId) => set({ status: 'ready', userId, errorMessage: null }),
  setError: (errorMessage) => set({ status: 'error', errorMessage }),
  setLoading: () => set({ status: 'loading', errorMessage: null }),
}));
