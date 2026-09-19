import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SubmitAttemptInput } from '@/services/api/sessionsApi';

/**
 * Der dauerhafte Teil der Antwort-Warteschlange.
 *
 * Bisher lag sie in einem Zustand-Store mit `persist`-Middleware. Das speichert
 * auch – aber ohne Rueckmeldung: `set()` kehrt sofort zurueck, geschrieben wird
 * danach. Zwischen beidem liegt ein Fenster, in dem ein Beenden der App die
 * gerade gegebene Antwort verliert. Genau das soll die Warteschlange
 * verhindern, also reicht "vorher einreihen" nicht: der Schreibvorgang muss
 * bestaetigt sein, bevor gesendet wird.
 *
 * Jede Aenderung laeuft deshalb ueber `write()`, und `write()` gibt ein
 * Promise zurueck, das erst aufloest, wenn AsyncStorage bestaetigt hat. Die
 * Aufrufe sind serialisiert – zwei schnelle Antworten hintereinander duerfen
 * sich nicht gegenseitig ueberholen und dabei die eine oder andere verlieren.
 */

const KEY = 'quizbyte.attempt-outbox.v2';
/** Die alte Fassung: ein Zustand-Store mit `persist`. */
const LEGACY_KEY = 'quizbyte.attempt-outbox';

export interface OutboxEntry extends SubmitAttemptInput {
  /** Wann die Antwort gegeben wurde – die Warteschlange bleibt in ihrer Reihenfolge. */
  queuedAt: number;
  /** Wie oft der Versand bereits gescheitert ist. */
  failures: number;
}

export const MAX_DELIVERY_ATTEMPTS = 10;

let cache: OutboxEntry[] | null = null;
let chain: Promise<unknown> = Promise.resolve();

/** Haelt die Schreibvorgaenge in ihrer Reihenfolge. */
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function sameAttempt(a: SubmitAttemptInput, b: SubmitAttemptInput): boolean {
  return a.sessionId === b.sessionId && a.questionId === b.questionId;
}

function parse(raw: string | null): OutboxEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]).filter((entry) => Boolean(entry?.sessionId)) : [];
  } catch {
    return [];
  }
}

/**
 * Uebernimmt, was die alte Fassung hinterlassen hat.
 *
 * Die Eintraege tragen ihre `userId` bei sich; wem sie gehoeren, entscheidet
 * beim Versand der Filter, nicht hier. Was sich nicht lesen laesst, ist
 * verloren – dann lieber leer anfangen als beim Start abstuerzen.
 */
async function readLegacy(): Promise<OutboxEntry[]> {
  const raw = await AsyncStorage.getItem(LEGACY_KEY).catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { state?: { pending?: SubmitAttemptInput[] } };
    const pending = parsed?.state?.pending ?? [];
    return pending
      .filter((entry) => Boolean(entry?.sessionId && entry?.userId))
      .map((entry) => ({ ...entry, queuedAt: Date.now(), failures: 0 }));
  } catch {
    return [];
  } finally {
    await AsyncStorage.removeItem(LEGACY_KEY).catch(() => undefined);
  }
}

export async function loadEntries(): Promise<OutboxEntry[]> {
  if (cache) return cache;
  return serialize(async () => {
    if (cache) return cache;
    const stored = parse(await AsyncStorage.getItem(KEY).catch(() => null));
    const legacy = stored.length === 0 ? await readLegacy() : [];
    cache = [...stored, ...legacy];
    if (legacy.length > 0) await AsyncStorage.setItem(KEY, JSON.stringify(cache));
    return cache;
  });
}

/** Schreibt die Liste und loest erst auf, wenn sie wirklich liegt. */
async function write(next: OutboxEntry[]): Promise<OutboxEntry[]> {
  return serialize(async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    cache = next;
    return next;
  });
}

/** Reiht eine Antwort ein. Nach dem Auflösen übersteht sie ein Beenden der App. */
export async function appendEntry(input: SubmitAttemptInput): Promise<OutboxEntry[]> {
  const entries = await loadEntries();
  if (entries.some((entry) => sameAttempt(entry, input))) return entries;
  return write([...entries, { ...input, queuedAt: Date.now(), failures: 0 }]);
}

/** Nimmt eine Antwort heraus – erst, wenn der Server sie bestaetigt hat. */
export async function dropEntry(input: SubmitAttemptInput): Promise<OutboxEntry[]> {
  const entries = await loadEntries();
  if (!entries.some((entry) => sameAttempt(entry, input))) return entries;
  return write(entries.filter((entry) => !sameAttempt(entry, input)));
}

/** Zaehlt einen Fehlversuch mit, ohne den Eintrag wegzuwerfen. */
export async function markFailure(input: SubmitAttemptInput): Promise<OutboxEntry[]> {
  const entries = await loadEntries();
  return write(
    entries.map((entry) => (sameAttempt(entry, input) ? { ...entry, failures: entry.failures + 1 } : entry)),
  );
}

/** Loescht alles eines Kontos – nach einer Kontoloeschung gibt es nichts mehr zu senden. */
export async function dropEntriesOfUser(userId: string): Promise<OutboxEntry[]> {
  const entries = await loadEntries();
  if (!entries.some((entry) => entry.userId === userId)) return entries;
  return write(entries.filter((entry) => entry.userId !== userId));
}

/** Nur fuer Tests: wirft den Zwischenspeicher weg, damit neu gelesen wird. */
export function resetOutboxCache(): void {
  cache = null;
  chain = Promise.resolve();
}
