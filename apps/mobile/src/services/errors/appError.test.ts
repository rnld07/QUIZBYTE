import { describe, expect, it } from 'vitest';

import { toAppError } from './appError';

describe('toAppError', () => {
  it('reads an expired session as one', () => {
    const error = toAppError({ code: '42501', message: 'permission denied for table quiz_sessions' });
    expect(error.code).toBe('unauthorized');
    expect(error.message).toContain('Sitzung');
  });

  it('says so when the account is suspended', () => {
    // Das ist der Text, den require_active_user() wirft. Beides kommt als
    // 42501 an; ohne die Unterscheidung stuende dort "Sitzung abgelaufen",
    // und der Nutzer wuerde die App wieder und wieder neu starten.
    const error = toAppError({ code: '42501', message: 'account is suspended' });
    expect(error.code).toBe('unauthorized');
    expect(error.message).toContain('gesperrt');
  });

  it('names a migration that has not been pushed', () => {
    const error = toAppError({ code: 'PGRST202', message: 'Could not find the function' });
    expect(error.code).toBe('not_configured');
  });
});
