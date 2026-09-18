import type { ImageSourcePropType } from 'react-native';

import { MEDAL_TIERS } from '@quizbyte/shared';
import type { MedalTier } from '@quizbyte/shared';

/**
 * Die Medaillenbilder – fuenf Stueck fuer acht Medaillen.
 *
 * Nach der Stufe, nicht nach der Medaille: was eine Medaille bedeutet, steht
 * als Name und Aufgabe darunter, und ein eigenes Bild je Medaille waere bei
 * vier Stufen zweiunddreissig Dateien fuer denselben Unterschied.
 *
 * `locked` ist die noch nicht verdiente – dieselbe Medaille, nur stumpf.
 */
export type MedalIconKey = MedalTier | 'locked';

export const MEDAL_ICON_KEYS: readonly MedalIconKey[] = ['locked', ...MEDAL_TIERS];

/**
 * Eigene Bilder fuer die Stufen.
 *
 * Metro loest `require()` beim Build auf, deshalb braucht jedes Bild einen
 * statischen Eintrag – siehe `assets/icons/medals/README.md`. Datei in den
 * Ordner legen, nach der Stufe benennen, die passende Zeile einkommentieren.
 * Ohne Eintrag wird die gezeichnete Scheibe verwendet, ein leerer Ordner
 * bricht also nichts – und wer nur Gold hinterlegt, bekommt eben nur dort ein
 * Bild.
 */
const MEDAL_ICONS: Partial<Record<MedalIconKey, ImageSourcePropType>> = {
  locked: require('../../assets/icons/medals/locked.png'),
  bronze: require('../../assets/icons/medals/bronze.png'),
  silver: require('../../assets/icons/medals/silver.png'),
  gold: require('../../assets/icons/medals/gold.png'),
  platinum: require('../../assets/icons/medals/platinum.png'),
};

/** Das hinterlegte Bild einer Stufe, oder undefined solange keins da ist. */
export function medalIcon(tier: MedalTier | null): ImageSourcePropType | undefined {
  return MEDAL_ICONS[tier ?? 'locked'];
}
