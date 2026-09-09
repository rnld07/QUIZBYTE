import type { Session } from '@supabase/supabase-js';

import { env } from '@/config/env';
import { AppError, toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

/**
 * Guest-first authentication.
 *
 * On first launch the user is signed in anonymously (Supabase anonymous auth).
 * All progress is tied to that user id. Later the account can be upgraded to
 * e-mail / Apple / Google via `supabase.auth.updateUser` or `linkIdentity`
 * without losing progress.
 */
export async function ensureSession(): Promise<Session> {
  if (!env.isConfigured) {
    throw new AppError('not_configured', 'Die App ist noch nicht mit einem Backend verbunden.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  if (data.session) return data.session;

  const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
  if (anonError) throw toAppError(anonError);
  if (!anon.session) {
    throw new AppError('unknown', 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.');
  }
  return anon.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/** Signs out and clears the local session. A new guest session is created on next launch. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}
