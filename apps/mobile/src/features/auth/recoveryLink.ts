/**
 * Was in einem Link aus der "Passwort vergessen"-Mail steckt.
 *
 * Supabase haengt das Ergebnis an das Fragment der Rueckkehr-Adresse – bei
 * Erfolg zwei Tokens und `type=recovery`, bei einem abgelaufenen Link eine
 * Fehlerbeschreibung. Beides muss die App selbst auslesen: auf dem Telefon ist
 * `detectSessionInUrl` aus, weil es keine Browseradresse gibt, in der eine
 * Sitzung stehen koennte.
 *
 * Eigene Datei ohne React-Native-Abhaengigkeit, damit sie sich testen laesst.
 */

export type RecoveryLink =
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string };

/** Ein abgelaufener oder schon benutzter Link – die haeufigste Rueckmeldung. */
const EXPIRED = 'Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere einen neuen an.';

function fragmentOf(url: string): URLSearchParams | null {
  const hash = url.indexOf('#');
  if (hash < 0) return null;
  const fragment = url.slice(hash + 1);
  return fragment.length > 0 ? new URLSearchParams(fragment) : null;
}

export function parseRecoveryLink(url: string | null | undefined): RecoveryLink | null {
  if (!url) return null;

  const params = fragmentOf(url);
  if (!params) return null;

  const error = params.get('error') ?? params.get('error_code');
  if (error) {
    const description = params.get('error_description');
    return {
      kind: 'error',
      message: error.includes('expired') || !description ? EXPIRED : description.replace(/\+/g, ' '),
    };
  }

  // Nur Wiederherstellung. Ein Bestaetigungslink fuer eine neue Adresse kommt
  // durch dieselbe Tuer und hat hier nichts verloren.
  if (params.get('type') !== 'recovery') return null;

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return { kind: 'error', message: EXPIRED };

  return { kind: 'session', accessToken, refreshToken };
}
