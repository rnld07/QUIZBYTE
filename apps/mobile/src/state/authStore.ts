import { create } from 'zustand';

export type AuthStatus = 'loading' | 'signed-out' | 'ready' | 'error';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  /** No e-mail on the account – progress lives on this device only. */
  isGuest: boolean;
  email: string | null;
  /** Set while a new address is waiting for its confirmation mail. */
  pendingEmail: string | null;
  errorMessage: string | null;
  setReady: (session: { userId: string; isGuest: boolean; email: string | null; pendingEmail?: string | null }) => void;
  setError: (message: string) => void;
  setLoading: () => void;
  setSignedOut: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  userId: null,
  isGuest: true,
  email: null,
  pendingEmail: null,
  errorMessage: null,
  setReady: ({ userId, isGuest, email, pendingEmail = null }) =>
    set({ status: 'ready', userId, isGuest, email, pendingEmail, errorMessage: null }),
  setError: (errorMessage) => set({ status: 'error', errorMessage }),
  setLoading: () => set({ status: 'loading', errorMessage: null }),
  setSignedOut: () =>
    set({ status: 'signed-out', userId: null, isGuest: true, email: null, pendingEmail: null, errorMessage: null }),
}));
