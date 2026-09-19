import { create } from 'zustand';

import { submitAttempt } from '@/services/api/sessionsApi';
import type { SubmitAttemptInput, SubmittedAttempt } from '@/services/api/sessionsApi';
import { isNetworkError, logger, toAppError } from '@/services/errors';

import {
  appendEntry,
  dropEntriesOfUser,
  dropEntry,
  loadEntries,
  markFailure,
  MAX_DELIVERY_ATTEMPTS,
  sameAttempt,
} from './attemptOutboxStorage';
import type { OutboxEntry } from './attemptOutboxStorage';

/**
 * Antworten, die noch beim Server ankommen muessen.
 *
 * Die Reihenfolge ist: **erst speichern, dann senden**. Frueher war es
 * umgekehrt – gesendet wurde sofort, und nur wenn das an einem Netzfehler
 * scheiterte, landete die Antwort in der Warteschlange. Alles andere war weg:
 * ein Serverfehler, ein Absturz waehrend des Requests, ein Beenden der App im
 * falschen Moment.
 *
 * Der Store hier ist nur die Anzeige. Die Wahrheit liegt in
 * `attemptOutboxStorage`, und die schreibt bestaetigt.
 */

interface OutboxState {
  pending: OutboxEntry[];
}

export const useAttemptOutbox = create<OutboxState>()(() => ({ pending: [] }));

function publish(entries: OutboxEntry[]): OutboxEntry[] {
  useAttemptOutbox.setState({ pending: entries });
  return entries;
}

/** Laedt die Warteschlange beim Start in die Anzeige. */
export async function hydrateAttemptOutbox(): Promise<void> {
  publish(await loadEntries());
}

/** Wie viele Antworten dieser Runde noch unterwegs sind. */
export function selectPendingForSession(sessionId: string) {
  return (state: OutboxState): number =>
    state.pending.filter((entry) => entry.sessionId === sessionId && entry.failures < MAX_DELIVERY_ATTEMPTS).length;
}

/** Wie viele Antworten dieser Runde aufgegeben haben. */
export function selectStuckForSession(sessionId: string) {
  return (state: OutboxState): number =>
    state.pending.filter((entry) => entry.sessionId === sessionId && entry.failures >= MAX_DELIVERY_ATTEMPTS).length;
}

/**
 * Speichert eine Antwort und schickt sie ab.
 *
 * Das Promise loest auf, sobald der Versand entschieden ist – gelungen oder
 * liegengeblieben. Wichtig ist der Punkt davor: `appendEntry` ist erledigt,
 * bevor der erste Netzaufruf startet. Ab da uebersteht die Antwort jedes Ende
 * der App.
 */
export async function deliverAttempt(
  input: SubmitAttemptInput,
  send: (input: SubmitAttemptInput) => Promise<SubmittedAttempt> = submitAttempt,
): Promise<SubmittedAttempt | null> {
  publish(await appendEntry(input));

  try {
    const stored = await send(input);
    publish(await dropEntry(input));
    return stored;
  } catch (error) {
    publish(await recordFailure(input, error));
    return null;
  }
}

/**
 * Entscheidet, was mit einer Antwort passiert, die nicht ankam.
 *
 * Weggeworfen wird nur, was auch bei einem zweiten Versuch nicht ankommen kann:
 * eine ungueltige Eingabe, eine Runde oder Frage, die es nicht gibt. Alles
 * andere bleibt liegen – frueher flog bei jedem unbekannten Serverfehler die
 * Antwort weg, und der Nutzer sah eine Runde, die der Server nie gesehen hat.
 */
async function recordFailure(input: SubmitAttemptInput, error: unknown): Promise<OutboxEntry[]> {
  // Ein Netzfehler ist kein Fehlversuch im Sinne der Zaehlung: wer eine Woche
  // im Funkloch spielt, soll seine Antworten nicht verlieren, weil zehnmal
  // dieselbe fehlende Verbindung dazwischenkam.
  if (isNetworkError(error)) return loadEntries();

  const appError = toAppError(error);
  if (appError.code === 'validation' || appError.code === 'not_found') {
    logger.warn('dropping unsendable attempt', appError.code);
    return dropEntry(input);
  }

  logger.warn('attempt still queued', appError.code);
  return markFailure(input);
}

let flushing = false;

/**
 * Versucht, alles Liegengebliebene loszuwerden. Beliebig oft aufrufbar.
 *
 * Nur die Antworten des angemeldeten Kontos: ein Eintrag eines anderen Kontos
 * laesst sich ohnehin nicht senden, und frueher blockierte genau der die
 * Warteschlange fuer alle danach.
 */
export async function flushAttemptOutbox(userId: string | null): Promise<boolean> {
  if (!userId) return true;
  if (flushing) return pendingFor(await loadEntries(), userId) === 0;

  flushing = true;
  try {
    for (const entry of (await loadEntries()).filter((item) => item.userId === userId)) {
      if (entry.failures >= MAX_DELIVERY_ATTEMPTS) continue;
      try {
        await submitAttempt(entry);
        publish(await dropEntry(entry));
      } catch (error) {
        publish(await recordFailure(entry, error));
        // Ohne Verbindung hat der Rest der Warteschlange auch keine.
        if (isNetworkError(error)) return false;
      }
    }
    return pendingFor(await loadEntries(), userId) === 0;
  } finally {
    flushing = false;
  }
}

function pendingFor(entries: OutboxEntry[], userId: string): number {
  return entries.filter((entry) => entry.userId === userId && entry.failures < MAX_DELIVERY_ATTEMPTS).length;
}

/** Nach einer Kontoloeschung gibt es nichts mehr zu senden. */
export async function forgetAttemptsOfUser(userId: string): Promise<void> {
  publish(await dropEntriesOfUser(userId));
}

export { sameAttempt };
export type { OutboxEntry };
