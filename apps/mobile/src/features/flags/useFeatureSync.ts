import { useEffect } from 'react';

import { features } from '@quizbyte/shared';
import type { FeatureFlag } from '@quizbyte/shared';

import { fetchFeatureFlags } from '@/services/api/flagsApi';
import { logger } from '@/services/errors';
import { useFeatureStore } from '@/state/featureStore';

/**
 * Holt die serverseitigen Überschreibungen – einmal beim Start.
 *
 * Kein `useQuery`: es gibt nichts anzuzeigen und nichts neu zu laden, das
 * Ergebnis landet im Store und bleibt dort für die Sitzung. Ein Schalter, der
 * sich mitten im Spielen umlegt, wäre auch nichts, was man sich wünscht.
 *
 * Fehler werden geschluckt. Ohne Antwort gilt, was im Code steht, und das ist
 * die Einstellung, mit der die App ausgeliefert wurde – keine Ausnahmelage.
 */
export function useFeatureSync(): void {
  const applyOverrides = useFeatureStore((state) => state.applyOverrides);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rows = await fetchFeatureFlags();
        if (cancelled) return;

        const overrides: Partial<Record<FeatureFlag, boolean>> = {};
        for (const row of rows) {
          // Nur bekannte Schlüssel: ein Eintrag für ein Feature, das es in
          // dieser App-Version nicht gibt, ist kein Grund, irgendetwas zu tun.
          if (row.key in features) overrides[row.key as FeatureFlag] = row.enabled;
        }
        applyOverrides(overrides);
      } catch (error) {
        logger.warn('Feature-Schalter konnten nicht geladen werden', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyOverrides]);
}
