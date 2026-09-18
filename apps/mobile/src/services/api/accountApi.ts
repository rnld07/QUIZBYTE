import { AppError, toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

/**
 * Proves that the person holding the phone knows the password.
 *
 * A signed-in session is not that proof – it survives for months, and a phone
 * left on a table is signed in. Anything that cannot be undone asks again.
 */
export async function reauthenticate(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new AppError('unauthorized', 'Das Passwort stimmt nicht.');
}

/**
 * Deletes the signed-in account.
 *
 * Everything personal hangs off the auth user by cascade, so the server does it
 * in one statement – see `delete_my_account()`. What stays are the questions and
 * study sheets an admin wrote; those belong to the app.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw toAppError(error, 'Das Konto konnte nicht gelöscht werden.');
}

/** Stores the two privacy switches. */
export async function setPrivacySettings(searchable: boolean, allowFriendRequests: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_privacy_settings', {
    p_searchable: searchable,
    p_allow_friend_requests: allowFriendRequests,
  });
  if (error) throw toAppError(error, 'Die Einstellung konnte nicht gespeichert werden.');
}
