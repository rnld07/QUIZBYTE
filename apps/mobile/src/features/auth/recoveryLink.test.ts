import { describe, expect, it } from 'vitest';

import { parseRecoveryLink } from './recoveryLink';

describe('parseRecoveryLink', () => {
  it('reads the tokens out of a recovery link', () => {
    const link = parseRecoveryLink(
      'quizbyte://auth/reset#access_token=abc&refresh_token=def&type=recovery&expires_in=3600',
    );
    expect(link).toEqual({ kind: 'session', accessToken: 'abc', refreshToken: 'def' });
  });

  it('says what went wrong when the link is spent', () => {
    const link = parseRecoveryLink(
      'quizbyte://auth/reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    );
    expect(link?.kind).toBe('error');
  });

  it('leaves other links alone', () => {
    // Die Bestaetigung einer neuen Adresse kommt durch dieselbe Tuer.
    expect(parseRecoveryLink('quizbyte://auth/reset#access_token=abc&refresh_token=def&type=signup')).toBeNull();
    expect(parseRecoveryLink('quizbyte://quiz/session')).toBeNull();
    expect(parseRecoveryLink(null)).toBeNull();
  });

  it('does not accept a recovery link without tokens', () => {
    expect(parseRecoveryLink('quizbyte://auth/reset#type=recovery')).toEqual({
      kind: 'error',
      message: expect.stringContaining('abgelaufen'),
    });
  });
});
