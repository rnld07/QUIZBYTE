import { isBlockedUsername } from './usernameFilter';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/** Allowed characters after normalisation: a-z, 0-9, underscore and dot. */
const USERNAME_PATTERN = /^[a-z0-9._]+$/;

export type UsernameError = 'too_short' | 'too_long' | 'invalid_chars' | 'invalid_edge' | 'consecutive_dots' | 'blocked';

export type UsernameValidation = { ok: true; value: string } | { ok: false; error: UsernameError };

/** Normalises user input: trims whitespace and lower-cases (usernames are case-insensitive). */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Validates a username. Mirrors the `username_format` check constraint in the
 * database, plus the word filter behind it.
 *
 * Rules: 3–20 characters, only a-z 0-9 _ ., must not start or end with a dot,
 * no consecutive dots, and nothing on the block list – see `isBlockedUsername`.
 */
export function validateUsername(input: string): UsernameValidation {
  const value = normalizeUsername(input);
  if (value.length < USERNAME_MIN_LENGTH) return { ok: false, error: 'too_short' };
  if (value.length > USERNAME_MAX_LENGTH) return { ok: false, error: 'too_long' };
  if (!USERNAME_PATTERN.test(value)) return { ok: false, error: 'invalid_chars' };
  if (value.startsWith('.') || value.endsWith('.')) return { ok: false, error: 'invalid_edge' };
  if (value.includes('..')) return { ok: false, error: 'consecutive_dots' };
  // Last: a name refused for its shape should be told about its shape, which is
  // the part the writer can do something about.
  if (isBlockedUsername(value)) return { ok: false, error: 'blocked' };
  return { ok: true, value };
}

export const DISPLAY_NAME_MAX_LENGTH = 40;

export function validateDisplayName(input: string): { ok: true; value: string | null } | { ok: false; error: 'too_long' } {
  const value = input.trim();
  if (value.length === 0) return { ok: true, value: null };
  if (value.length > DISPLAY_NAME_MAX_LENGTH) return { ok: false, error: 'too_long' };
  return { ok: true, value };
}
