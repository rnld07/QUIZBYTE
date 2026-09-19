import { useMutation } from '@tanstack/react-query';

import { linkAccount, sendPasswordReset, setNewPassword, signIn, signOut, signUp } from '@/services/auth/authService';
import type { Credentials, LinkResult, SignUpInput, SignUpResult } from '@/services/auth/authService';
import { useAuthStore } from '@/state/authStore';

/**
 * Who is signed in, as the screens need it.
 *
 * The store is fed by `useAuthBootstrap`, which listens to Supabase – so this
 * stays right after a sign-in, a sign-out or a confirmed e-mail without anyone
 * having to refetch.
 */
export function useAccount() {
  const isGuest = useAuthStore((state) => state.isGuest);
  const email = useAuthStore((state) => state.email);
  const pendingEmail = useAuthStore((state) => state.pendingEmail);
  return { isGuest, email, pendingEmail };
}

/** Creates a brand-new account. */
export function useSignUp() {
  return useMutation<SignUpResult, Error, SignUpInput>({ mutationFn: signUp });
}

/** Upgrades a leftover guest session – same user id, progress untouched. */
export function useLinkAccount() {
  return useMutation<LinkResult, Error, Credentials>({ mutationFn: linkAccount });
}

/** Signs in to an existing account. Whatever was played as a guest stays behind. */
export function useSignIn() {
  return useMutation<unknown, Error, Credentials>({ mutationFn: signIn });
}

export function useSignOut() {
  return useMutation<void, Error, void>({ mutationFn: signOut });
}

export function usePasswordReset() {
  return useMutation<void, Error, string>({ mutationFn: sendPasswordReset });
}

/** Setzt ein neues Passwort – nach dem Link aus der Mail. */
export function useSetNewPassword() {
  return useMutation<void, Error, string>({ mutationFn: setNewPassword });
}
