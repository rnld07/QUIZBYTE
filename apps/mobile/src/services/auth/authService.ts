import type { Session, User } from '@supabase/supabase-js';

import { normalizeEmail } from '@quizbyte/shared';

import { env } from '@/config/env';
import { AppError, toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

/**
 * The stored session, or null when nobody is signed in.
 *
 * QuizByte needs an account: progress, friends, duels and the chat all hang on
 * a user other people can find, and a guest has none of that. So there is no
 * anonymous fallback here – without a session the app shows the sign-in screen.
 */
export async function restoreSession(): Promise<Session | null> {
  if (!env.isConfigured) {
    throw new AppError('not_configured', 'Die App ist noch nicht mit einem Backend verbunden.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/** What the app needs to know about who is signed in. */
export interface AccountInfo {
  /** No e-mail yet – progress lives on this device only. */
  isGuest: boolean;
  /** The confirmed address, or null while there is none. */
  email: string | null;
  /** Set while a change of address is waiting for its confirmation mail. */
  pendingEmail: string | null;
}

export function accountFromUser(user: User | null): AccountInfo {
  if (!user) return { isGuest: true, email: null, pendingEmail: null };
  return {
    isGuest: user.is_anonymous === true || !user.email,
    email: user.email ?? null,
    // Supabase parks the new address here until the mail is confirmed.
    pendingEmail: (user.new_email as string | undefined) ?? null,
  };
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpInput extends Credentials {
  /** Goes along as metadata; the database trigger takes it if it is free. */
  username: string;
}

export type SignUpResult =
  /** Straight in – the session is live. */
  | { status: 'signed_in' }
  /** The project asks for a confirmed address first. */
  | { status: 'confirmation_sent'; email: string };

/**
 * Creates a brand-new account.
 *
 * The username travels in the sign-up metadata rather than being written
 * afterwards: with e-mail confirmation switched on there is no session between
 * signing up and the first sign-in, so there would be no moment in which the
 * client could write it.
 */
export async function signUp({ email, password, username }: SignUpInput): Promise<SignUpResult> {
  const address = normalizeEmail(email);
  const { data, error } = await supabase.auth.signUp({
    email: address,
    password,
    options: { data: { username } },
  });
  if (error) throw toAuthError(error);
  return data.session ? { status: 'signed_in' } : { status: 'confirmation_sent', email: address };
}

export type LinkResult =
  /** Done – the address is on the account and can be used to sign in. */
  | { status: 'linked' }
  /** Supabase sent a confirmation mail; the address counts once it is opened. */
  | { status: 'confirmation_sent'; email: string };

/**
 * Turns a leftover guest session into a real account, keeping the user id.
 *
 * Only reachable by someone who played before the app required an account:
 * `updateUser` rather than `signUp`, so their XP, streak and highscores come
 * along instead of staying behind on a user nobody can sign in as. Whether the
 * address is live straight away or needs a confirmation mail first is a project
 * setting ("Confirm email") – both outcomes are reported, because they mean
 * different things to the user.
 */
export async function linkAccount({ email, password }: Credentials): Promise<LinkResult> {
  const address = normalizeEmail(email);
  const { data, error } = await supabase.auth.updateUser({ email: address, password });
  if (error) throw toAuthError(error);

  // The password is set either way; only the address may still be pending.
  return data.user?.email === address ? { status: 'linked' } : { status: 'confirmation_sent', email: address };
}

/**
 * Signs in to an existing account.
 *
 * This replaces the session, guest and all: whatever was played as a guest on
 * this device stays with the guest user and is not merged. The screen says so
 * before it gets here.
 */
export async function signIn({ email, password }: Credentials): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  if (error) throw toAuthError(error);
  if (!data.session) throw new AppError('unknown', 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.');
  return data.session;
}

/** Sends the "set a new password" mail. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
  if (error) throw toAuthError(error);
}

/** Signs out and clears the local session. A new guest session follows on its own. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}

/**
 * Turns Supabase's auth errors into something a person can act on.
 *
 * The wording from the API is English and aimed at developers ("Invalid login
 * credentials"), and the generic mapper has no way of knowing which of them
 * mean what here.
 */
function toAuthError(error: { message: string; code?: string; status?: number }): AppError {
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new AppError('unauthorized', 'E-Mail oder Passwort stimmt nicht.', error);
  }
  if (message.includes('email not confirmed')) {
    return new AppError('unauthorized', 'Bestätige zuerst die E-Mail, die wir dir geschickt haben.', error);
  }
  if (message.includes('already registered') || message.includes('already been registered') || error.code === 'email_exists') {
    return new AppError(
      'conflict',
      'Für diese E-Mail gibt es schon ein Konto. Melde dich stattdessen damit an.',
      error,
    );
  }
  if (message.includes('same password')) {
    return new AppError('validation', 'Das ist dein bisheriges Passwort. Wähle ein anderes.', error);
  }
  if (message.includes('weak password') || message.includes('password should be')) {
    return new AppError('validation', 'Das Passwort ist zu schwach. Nimm ein längeres.', error);
  }
  // Supabase rate-limits the mail endpoints per hour, and says so only in English.
  if (error.status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return new AppError('rate_limited', 'Zu viele Versuche. Warte einen Moment und probiere es dann erneut.', error);
  }
  return toAppError(error);
}
