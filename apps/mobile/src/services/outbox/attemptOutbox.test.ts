import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnswerKey } from '@quizbyte/shared';

/*
  Ein Speicher, der mitschreibt, wann geschrieben wurde.

  Genau darauf kommt es an: die Antwort muss auf dem Geraet liegen, *bevor* der
  erste Netzaufruf startet. Ein Test, der nur das Ergebnis prueft, waere auch
  mit der alten Reihenfolge zufrieden gewesen.
*/
const store = new Map<string, string>();
const log: string[] = [];

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      log.push(`write:${key}`);
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  },
}));

const submitAttempt = vi.fn();
vi.mock('@/services/api/sessionsApi', () => ({
  submitAttempt: (...args: unknown[]) => {
    log.push('send');
    return submitAttempt(...args);
  },
}));

const { deliverAttempt, flushAttemptOutbox, forgetAttemptsOfUser, hydrateAttemptOutbox, useAttemptOutbox } =
  await import('./attemptOutbox');
const { resetOutboxCache } = await import('./attemptOutboxStorage');

const attempt = (overrides: Partial<{ userId: string; sessionId: string; questionId: string }> = {}) => ({
  userId: 'user-1',
  sessionId: 'session-1',
  questionId: 'question-1',
  selectedAnswer: 'A' as AnswerKey,
  responseTimeMs: 1200,
  answeredOn: '2026-09-19',
  ...overrides,
});

const answered = { questionId: 'question-1', selectedAnswer: 'A' as AnswerKey, isCorrect: true, responseTimeMs: 1200, xpEarned: 8, correctAnswer: 'A' as AnswerKey, explanation: '' };

const stored = (): { sessionId: string; questionId: string; userId: string; failures: number }[] =>
  JSON.parse(store.get('quizbyte.attempt-outbox.v2') ?? '[]');

beforeEach(() => {
  store.clear();
  log.length = 0;
  submitAttempt.mockReset();
  resetOutboxCache();
  useAttemptOutbox.setState({ pending: [] });
});

describe('deliverAttempt', () => {
  it('stores the answer before it sends it', async () => {
    submitAttempt.mockResolvedValue(answered);
    await deliverAttempt(attempt());

    const firstWrite = log.indexOf('write:quizbyte.attempt-outbox.v2');
    expect(firstWrite).toBeGreaterThanOrEqual(0);
    expect(firstWrite).toBeLessThan(log.indexOf('send'));
  });

  it('survives the app being killed right after the answer', async () => {
    // Der Versand haengt und wird nie beantwortet – wie bei einem Kill.
    submitAttempt.mockImplementation(() => new Promise(() => {}));
    void deliverAttempt(attempt());
    // Ein Tick reicht: gespeichert wird vor dem Senden.
    await vi.waitFor(() => expect(stored()).toHaveLength(1));

    // Neustart: frisch aus demselben Speicher gelesen.
    resetOutboxCache();
    await hydrateAttemptOutbox();
    expect(useAttemptOutbox.getState().pending).toHaveLength(1);
  });

  it('takes the answer out once the server has it', async () => {
    submitAttempt.mockResolvedValue(answered);
    await deliverAttempt(attempt());
    expect(stored()).toHaveLength(0);
    expect(useAttemptOutbox.getState().pending).toHaveLength(0);
  });

  it('keeps the answer when the connection is gone', async () => {
    submitAttempt.mockRejectedValue(new TypeError('Network request failed'));
    await deliverAttempt(attempt());
    expect(stored()).toHaveLength(1);
    // Ein Funkloch ist kein Fehlversuch: sonst waere die Antwort nach zehn
    // vergeblichen Anlaeufen aufgegeben, obwohl nie ein Server sie gesehen hat.
    expect(stored()[0]?.failures).toBe(0);
  });

  it('keeps the answer when the server says something unexpected', async () => {
    // Genau das flog frueher weg: alles ausser "nicht angemeldet" wurde
    // verworfen, und der Nutzer sah eine Runde, die der Server nie bekam.
    submitAttempt.mockRejectedValue({ code: '40001', message: 'serialization failure' });
    await deliverAttempt(attempt());
    expect(stored()).toHaveLength(1);
    expect(stored()[0]?.failures).toBe(1);
  });

  it('drops an answer that can never arrive', async () => {
    submitAttempt.mockRejectedValue({ code: 'PGRST116', message: 'no rows' });
    await deliverAttempt(attempt());
    expect(stored()).toHaveLength(0);
  });
});

describe('flushAttemptOutbox', () => {
  it('sends only what belongs to the signed-in account', async () => {
    submitAttempt.mockRejectedValue(new TypeError('Network request failed'));
    await deliverAttempt(attempt({ userId: 'user-2', questionId: 'question-2' }));
    await deliverAttempt(attempt());
    expect(stored()).toHaveLength(2);

    submitAttempt.mockReset();
    submitAttempt.mockResolvedValue(answered);
    const done = await flushAttemptOutbox('user-1');

    expect(done).toBe(true);
    expect(submitAttempt).toHaveBeenCalledTimes(1);
    // Der fremde Eintrag bleibt liegen – und blockiert nichts.
    expect(stored()).toHaveLength(1);
    expect(stored()[0]?.userId).toBe('user-2');
  });

  it('forgets everything of a deleted account', async () => {
    submitAttempt.mockRejectedValue(new TypeError('Network request failed'));
    await deliverAttempt(attempt());
    await forgetAttemptsOfUser('user-1');
    expect(stored()).toHaveLength(0);
  });
});

describe('the queue of the previous version', () => {
  it('is taken over on the first start', async () => {
    store.set(
      'quizbyte.attempt-outbox',
      JSON.stringify({ state: { pending: [attempt()] }, version: 0 }),
    );
    await hydrateAttemptOutbox();

    expect(useAttemptOutbox.getState().pending).toHaveLength(1);
    expect(store.has('quizbyte.attempt-outbox')).toBe(false);
  });
});
