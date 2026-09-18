import { describe, expect, it } from 'vitest';

import { normalizeEmail, validateEmail, validatePassword } from './credentials';

describe('validateEmail', () => {
  it('accepts an ordinary address and hands it back normalised', () => {
    expect(validateEmail('  Max.Mustermann@Example.COM ')).toEqual({ ok: true, value: 'max.mustermann@example.com' });
  });

  it('rejects an empty field', () => {
    expect(validateEmail('   ')).toEqual({ ok: false, error: 'empty' });
  });

  it.each(['nurtext', 'ohne@punkt', 'zwei@@at.de', 'mit leer@zeichen.de', '@example.com'])('rejects %s', (input) => {
    expect(validateEmail(input)).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects an address longer than the limit', () => {
    expect(validateEmail(`${'a'.repeat(250)}@example.com`)).toEqual({ ok: false, error: 'too_long' });
  });

  it('lower-cases so the same address is never two accounts', () => {
    expect(normalizeEmail('TEST@Example.de')).toBe('test@example.de');
  });
});

describe('validatePassword', () => {
  it('accepts eight characters', () => {
    expect(validatePassword('geheim12')).toEqual({ ok: true, value: 'geheim12' });
  });

  it('rejects an empty field', () => {
    expect(validatePassword('')).toEqual({ ok: false, error: 'empty' });
  });

  it('rejects anything shorter than eight', () => {
    expect(validatePassword('kurz12')).toEqual({ ok: false, error: 'too_short' });
  });

  it('keeps spaces instead of trimming them away', () => {
    expect(validatePassword(' mit raum ')).toEqual({ ok: true, value: ' mit raum ' });
  });

  it('counts bytes, not characters, against the bcrypt limit', () => {
    // 36 emoji of four bytes each: well inside 72 characters, well past 72 bytes.
    expect(validatePassword('🔒'.repeat(36))).toEqual({ ok: false, error: 'too_long' });
    expect(validatePassword('a'.repeat(72))).toEqual({ ok: true, value: 'a'.repeat(72) });
  });
});
