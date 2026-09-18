import type { ImageSourcePropType } from 'react-native';

/**
 * The headings and buttons that can carry your own symbol.
 *
 * Keyed by what the thing is, not by the screen it sits on – "Schwierigkeit"
 * heads a block in the analysis and in every category sheet, and one picture
 * should serve both.
 */
export const SECTION_ICON_KEYS = ['pdf', 'images', 'answers', 'difficulty', 'categories', 'mode', 'total'] as const;
export type SectionIconKey = (typeof SECTION_ICON_KEYS)[number];

/**
 * Custom symbols for those headings.
 *
 * Metro resolves `require()` at build time, so every image needs one static
 * entry here – see `assets/icons/sections/README.md`. Drop the file into that
 * folder, name it after the key, then uncomment the matching line. Anything
 * without an entry keeps its Ionicon, so an empty folder breaks nothing.
 */
const SECTION_ICONS: Partial<Record<SectionIconKey, ImageSourcePropType>> = {
  pdf: require('../../assets/icons/sections/pdf.png'),
  images: require('../../assets/icons/sections/images.png'),
  answers: require('../../assets/icons/sections/answers.png'),
  difficulty: require('../../assets/icons/sections/difficulty.png'),
  categories: require('../../assets/icons/sections/categories.png'),
  mode: require('../../assets/icons/sections/mode.png'),
  total: require('../../assets/icons/sections/total.png'),
};

/** The registered symbol, or undefined while none is set. */
export function sectionIcon(key: SectionIconKey): ImageSourcePropType | undefined {
  return SECTION_ICONS[key];
}
