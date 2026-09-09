import { describe, expect, it } from 'vitest';

import { normalizeUsername, validateDisplayName, validateUsername } from './username';

describe('validateUsername', () => {
  it('accepts valid usernames and normalises case', () => {
    expect(validateUsername('Ronald_07')).toEqual({ ok: true, value: 'ronald_07' });
    expect(validateUsername('  max.mustermann ')).toEqual({ ok: true, value: 'max.mustermann' });
    expect(validateUsername('abc')).toEqual({ ok: true, value: 'abc' });
  });

  it('rejects too short or too long names', () => {
    expect(validateUsername('ab')).toEqual({ ok: false, error: 'too_short' });
    expect(validateUsername('a'.repeat(21))).toEqual({ ok: false, error: 'too_long' });
  });

  it('rejects spaces and special characters', () => {
    expect(validateUsername('max mustermann')).toEqual({ ok: false, error: 'invalid_chars' });
    expect(validateUsername('max-mustermann')).toEqual({ ok: false, error: 'invalid_chars' });
    expect(validateUsername('mäx')).toEqual({ ok: false, error: 'invalid_chars' });
  });

  it('rejects leading/trailing and consecutive dots', () => {
    expect(validateUsername('.max')).toEqual({ ok: false, error: 'invalid_edge' });
    expect(validateUsername('max.')).toEqual({ ok: false, error: 'invalid_edge' });
    expect(validateUsername('ma..x')).toEqual({ ok: false, error: 'consecutive_dots' });
  });

  it('normalises consistently', () => {
    expect(normalizeUsername('  QuizByte ')).toBe('quizbyte');
  });
});

describe('validateDisplayName', () => {
  it('treats empty input as "no display name"', () => {
    expect(validateDisplayName('   ')).toEqual({ ok: true, value: null });
  });

  it('accepts and trims regular names', () => {
    expect(validateDisplayName(' Ronald ')).toEqual({ ok: true, value: 'Ronald' });
  });

  it('rejects overly long names', () => {
    expect(validateDisplayName('x'.repeat(41))).toEqual({ ok: false, error: 'too_long' });
  });
});
