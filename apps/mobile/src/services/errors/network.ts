/**
 * Erkennt einen Verbindungsfehler – auch, wenn er schon uebersetzt wurde.
 *
 * Der zweite Teil ist der Punkt. `toAppError` macht aus dem rohen Fehler einen
 * `AppError` mit dem Code 'network' und einer deutschen Meldung. Danach passte
 * keine der Wortproben unten mehr, und drei Stellen, die sich auf diese
 * Funktion verlassen, haben einen Verbindungsabbruch nicht mehr als solchen
 * erkannt: der Wiederholungsversuch von TanStack Query, die Warteschlange und
 * der Rundenabschluss.
 *
 * Geprueft wird strukturell und nicht mit `instanceof`: `appError.ts` benutzt
 * diese Datei, ein Import zurueck waere ein Ringschluss.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ((error as { code?: unknown }).code === 'network') return true;
  const message = String((error as { message?: unknown }).message ?? '').toLowerCase();
  const name = String((error as { name?: unknown }).name ?? '');
  return (
    name === 'AuthRetryableFetchError' ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror')
  );
}
