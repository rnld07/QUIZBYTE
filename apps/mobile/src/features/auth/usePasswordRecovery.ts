import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';

import { logger } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import { parseRecoveryLink } from './recoveryLink';

interface PasswordRecovery {
  /** True, solange ein neues Passwort gesetzt werden soll. */
  active: boolean;
  /** Warum der Link nicht funktioniert hat – sonst null. */
  error: string | null;
  /** Fertig: zurueck in die App. */
  dismiss: () => void;
}

/**
 * Nimmt den Link aus der "Passwort vergessen"-Mail entgegen.
 *
 * Bisher endete dieser Weg im Nichts: die Mail ging raus, aber es gab keine
 * Rueckkehr-Adresse und keinen Bildschirm, auf dem sich ein neues Passwort
 * setzen laesst. Wer sein Passwort vergessen hatte, kam nicht mehr an sein
 * Konto.
 *
 * Der Link bringt eine Sitzung mit. Die wird uebernommen – danach ist man
 * angemeldet, und genau deshalb kommt der Bildschirm zum Setzen des neuen
 * Passworts vor allem anderen: sonst stuende man in der App und haette immer
 * noch kein Passwort, das man kennt.
 */
export function usePasswordRecovery(): PasswordRecovery {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const handle = async (url: string | null | undefined) => {
      const link = parseRecoveryLink(url);
      if (!link || !alive) return;

      if (link.kind === 'error') {
        setError(link.message);
        setActive(true);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: link.accessToken,
        refresh_token: link.refreshToken,
      });
      if (!alive) return;
      if (sessionError) {
        logger.warn('recovery session failed', sessionError);
        setError('Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere einen neuen an.');
      } else {
        setError(null);
      }
      setActive(true);
    };

    // Beide Wege: die App lag im Hintergrund, oder sie startet gerade erst.
    const subscription = Linking.addEventListener('url', (event) => void handle(event.url));
    void Linking.getInitialURL().then((url) => handle(url));

    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const dismiss = useCallback(() => {
    setActive(false);
    setError(null);
  }, []);

  return { active, error, dismiss };
}
