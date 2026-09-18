import { describe, expect, it } from 'vitest';

import { validateUsername } from './username';
import { flattenUsername, isBlockedUsername } from './usernameFilter';

describe('flattenUsername', () => {
  it('reads leetspeak back', () => {
    expect(flattenUsername('h1tl3r')).toBe('hitler');
    expect(flattenUsername('4ss')).toBe('as');
    expect(flattenUsername('$h1t')).toBe('shit');
  });

  it('throws away anything that is not a letter', () => {
    expect(flattenUsername('s.c.h.e.i.s.s.e')).toBe('scheise');
    expect(flattenUsername('f_u_c_k')).toBe('fuck');
    // The 2 has no letter behind it and is dropped; 0 and 1 are read back.
    expect(flattenUsername('max_2010')).toBe('maxoio');
  });

  it('writes out umlauts and drops accents', () => {
    expect(flattenUsername('Schäfer')).toBe('schafer');
    expect(flattenUsername('José')).toBe('jose');
    expect(flattenUsername('großer')).toBe('groser');
  });

  it('collapses repeated letters', () => {
    expect(flattenUsername('fuuuuck')).toBe('fuck');
    expect(flattenUsername('aaa')).toBe('a');
  });
});

describe('isBlockedUsername', () => {
  it('refuses the plain spellings', () => {
    expect(isBlockedUsername('arschloch')).toBe(true);
    expect(isBlockedUsername('hitler')).toBe(true);
    expect(isBlockedUsername('fuck')).toBe(true);
  });

  it('refuses them dressed up', () => {
    expect(isBlockedUsername('xXarschlochXx')).toBe(true);
    expect(isBlockedUsername('h1tl3r_88')).toBe(true);
    expect(isBlockedUsername('f.u.c.k.er')).toBe(true);
    expect(isBlockedUsername('sch31sse')).toBe(true);
    expect(isBlockedUsername('n1gg4')).toBe(true);
  });

  it('refuses a short word only when that is the whole name', () => {
    expect(isBlockedUsername('sex')).toBe(true);
    expect(isBlockedUsername('s3x')).toBe(true);
    // "Sextett" and "Klassenass" are words; the rule must not reach inside them.
    expect(isBlockedUsername('sextett')).toBe(false);
    expect(isBlockedUsername('klassenass')).toBe(false);
  });

  /*
    Every one of these was blocked at some point by a term that reached inside
    it – scheibe by "schei", cocktail by "cock", fukuda by "fuk". They are the
    reason those terms are whole-name-only now.
  */
  it('does not reach inside honest words', () => {
    for (const name of [
      'scheibe',
      'bescheinigung',
      'mongolei',
      'dickmann',
      'documentation',
      'grapefruit',
      'narcissist',
      'suspicion',
      'fagottist',
      'fukushima',
      'cocktail',
      'bichler',
      'nigeria',
      'sextett',
      'analyse',
    ]) {
      expect(isBlockedUsername(name), name).toBe(false);
    }
  });

  it('leaves ordinary names alone', () => {
    for (const name of [
      'ronald_07',
      'max.mustermann',
      'quizmaster',
      'anna2005',
      'lea_k',
      'analyse_pro',
      'classy_cat',
      'nigeria_fan',
      'assistent',
      'passwort_weg',
      'bassist',
      'kuchen',
      'informatiker',
    ]) {
      expect(isBlockedUsername(name), name).toBe(false);
    }
  });

  it('says nothing about an empty name, which is the length rule business', () => {
    expect(isBlockedUsername('')).toBe(false);
    expect(isBlockedUsername('123')).toBe(false);
  });
});

describe('validateUsername with the filter', () => {
  it('passes an ordinary name through untouched', () => {
    expect(validateUsername('Ronald_07')).toEqual({ ok: true, value: 'ronald_07' });
  });

  it('refuses a blocked one', () => {
    expect(validateUsername('Arschloch')).toEqual({ ok: false, error: 'blocked' });
    expect(validateUsername('h1tl3r')).toEqual({ ok: false, error: 'blocked' });
  });

  it('still reports the shape first', () => {
    // Too short comes back as too short, not as blocked – that is the part the
    // writer can act on.
    expect(validateUsername('as')).toEqual({ ok: false, error: 'too_short' });
  });
});
