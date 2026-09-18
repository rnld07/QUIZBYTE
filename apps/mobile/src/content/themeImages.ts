import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '@/theme';

/**
 * Symbols for the three options on the "Design" page.
 *
 * Metro resolves `require()` at build time, so every image needs one static
 * entry here – see `assets/theme/README.md`. Drop the file into `assets/theme/`,
 * name it after the mode, then uncomment the matching line. An option without
 * an entry keeps its glyph (sun, moon, phone), so an empty folder breaks
 * nothing.
 */
const THEME_IMAGES: Partial<Record<ThemeMode, ImageSourcePropType>> = {
  light: require('../../assets/theme/light.png'),
  dark: require('../../assets/theme/dark.png'),
  system: require('../../assets/theme/system.png'),
};

/** The registered symbol for a design option, or undefined while none is set. */
export function themeImage(mode: ThemeMode): ImageSourcePropType | undefined {
  return THEME_IMAGES[mode];
}
