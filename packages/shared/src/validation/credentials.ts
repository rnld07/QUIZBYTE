/** Longer than any address in practice, and what most providers accept. */
export const EMAIL_MAX_LENGTH = 254;

/** Short enough to type, long enough to be worth something. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt only ever looks at the first 72 bytes, so anything beyond that is a
 * password the user believes in and the server does not. Rejecting it is
 * kinder than silently ignoring the tail.
 */
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Deliberately loose: something, an @, something with a dot in it, no spaces.
 *
 * A stricter pattern only ever turns away real addresses – whether an address
 * exists is settled by the confirmation mail, not by a regular expression.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type EmailError = 'empty' | 'invalid' | 'too_long';
export type EmailValidation = { ok: true; value: string } | { ok: false; error: EmailError };

export type PasswordError = 'empty' | 'too_short' | 'too_long';
export type PasswordValidation = { ok: true; value: string } | { ok: false; error: PasswordError };

/** Trims and lower-cases: addresses are handled case-insensitively. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function validateEmail(input: string): EmailValidation {
  const value = normalizeEmail(input);
  if (value.length === 0) return { ok: false, error: 'empty' };
  if (value.length > EMAIL_MAX_LENGTH) return { ok: false, error: 'too_long' };
  if (!EMAIL_PATTERN.test(value)) return { ok: false, error: 'invalid' };
  return { ok: true, value };
}

/**
 * Checks a password, without touching it.
 *
 * Not trimmed, unlike the e-mail: a space is a character like any other, and
 * quietly removing one would lock the user out of the account they just made.
 */
export function validatePassword(input: string): PasswordValidation {
  if (input.length === 0) return { ok: false, error: 'empty' };
  if (input.length < PASSWORD_MIN_LENGTH) return { ok: false, error: 'too_short' };
  // Counted in bytes, because that is what bcrypt counts.
  if (new TextEncoder().encode(input).length > PASSWORD_MAX_LENGTH) return { ok: false, error: 'too_long' };
  return { ok: true, value: input };
}
