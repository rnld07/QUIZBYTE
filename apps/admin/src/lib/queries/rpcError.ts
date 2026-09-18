interface PostgrestLikeError {
  code?: string;
  message?: string;
}

/**
 * Macht aus einem RPC-Fehler einen Satz, mit dem man etwas anfangen kann.
 *
 * Der Grund für diese Funktion ist ein einziger Fehlercode: `PGRST202` heißt
 * "diese Funktion kennt die Datenbank nicht", und das bedeutet in der Praxis
 * immer dasselbe – eine Migration liegt im Repository, aber nicht in der
 * Datenbank. Die Rohmeldung dazu ("Could not find the function … in the schema
 * cache") liest sich wie ein Bug im Panel und ist keiner.
 *
 * `42501` ist der zweite Fall, der hier landet: die Funktion gibt es, aber die
 * Rolle stimmt nicht.
 */
export function rpcError(error: unknown, context: string): Error {
  const details = (error ?? {}) as PostgrestLikeError;

  if (details.code === 'PGRST202') {
    return new Error(
      `${context}: Die Datenbank kennt diese Funktion noch nicht. ` +
        'Spiele die ausstehenden Migrationen ein (supabase db push) und lade die Seite neu. ' +
        'Direkt nach dem Push kann es einen Moment dauern, bis PostgREST das Schema neu gelesen hat.',
    );
  }

  if (details.code === '42501') {
    return new Error(`${context}: Dafür fehlen die Adminrechte.`);
  }

  return new Error(`${context}: ${details.message ?? 'Unbekannter Fehler.'}`);
}
