import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

export interface FeatureFlagOverride {
  key: string;
  enabled: boolean;
}

/**
 * Die serverseitig gesetzten Schalter.
 *
 * Nur die Ausnahmen: Schlüssel, für die kein Eintrag existiert, kommen nicht
 * zurück, und dann gilt, was in `features.ts` steht.
 */
export async function fetchFeatureFlags(): Promise<FeatureFlagOverride[]> {
  const { data, error } = await supabase.rpc('get_feature_flags');
  if (error) throw toAppError(error, 'Die Feature-Schalter konnten nicht geladen werden.');
  return (data ?? []).map((row) => ({ key: row.key, enabled: row.enabled }));
}
