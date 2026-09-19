import { describe, expect, it } from 'vitest';

import { toAppError } from './appError';
import { isNetworkError } from './network';

describe('isNetworkError', () => {
  it('knows the raw fetch failure', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError({ name: 'AuthRetryableFetchError' })).toBe(true);
  });

  it('still knows it after it was translated', () => {
    /*
      Der eigentliche Befund. `toAppError` ersetzt die englische Meldung durch
      eine deutsche und haengt den Code an. Danach passte keine Wortprobe mehr,
      und drei Stellen hielten einen Verbindungsabbruch fuer einen beliebigen
      Fehler: der Wiederholungsversuch der Abfragen, die Warteschlange und der
      Rundenabschluss.
    */
    const translated = toAppError(new TypeError('Network request failed'));
    expect(translated.code).toBe('network');
    expect(isNetworkError(translated)).toBe(true);
  });

  it('does not mistake a server error for a lost connection', () => {
    expect(isNetworkError(toAppError({ code: '23505', message: 'duplicate key' }))).toBe(false);
    expect(isNetworkError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
