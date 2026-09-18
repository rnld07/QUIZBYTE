import { create } from 'zustand';

import { features } from '@quizbyte/shared';
import type { FeatureFlag } from '@quizbyte/shared';

type Flags = Record<FeatureFlag, boolean>;

interface FeatureState {
  /** Die geltenden Schalter: Code-Standard, überschrieben von dem, was der Server sagt. */
  flags: Flags;
  /** True, sobald der Server einmal geantwortet hat. */
  loaded: boolean;
  applyOverrides: (overrides: Partial<Flags>) => void;
}

/**
 * Die Feature-Schalter, wie sie in dieser Sitzung gelten.
 *
 * Der Ausgangswert ist das, was in `features.ts` steht – deshalb funktioniert
 * die App auch ohne Netz und ohne Wartezeit. Antwortet der Server, werden nur
 * die Schlüssel überschrieben, für die dort ein Eintrag liegt.
 *
 * Ein Zustand-Store statt eines Query-Hooks, weil die Schalter Struktur
 * entscheiden: welche Tabs es gibt, welche Kategorien geladen werden. Etwas,
 * das beim ersten Rendern noch nicht feststeht, würde einen Tab erscheinen und
 * wieder verschwinden lassen.
 */
export const useFeatureStore = create<FeatureState>((set) => ({
  flags: { ...features },
  loaded: false,
  applyOverrides: (overrides) =>
    set((state) => ({
      flags: { ...state.flags, ...overrides },
      loaded: true,
    })),
}));

/** Ein einzelner Schalter. */
export function useFeature(flag: FeatureFlag): boolean {
  return useFeatureStore((state) => state.flags[flag]);
}
