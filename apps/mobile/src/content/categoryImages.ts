import type { ImageSourcePropType } from 'react-native';

/**
 * Background images for the square category tiles on the start screen.
 *
 * Metro resolves `require()` at build time, so every image needs one static
 * entry here – see `assets/categories/README.md`. Drop the file into
 * `assets/categories/`, name it after the category slug, then uncomment (or
 * add) the matching line. Categories without an entry keep the gradient look.
 */
const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  random: require('../../assets/categories/random.png'),
  grundlagen: require('../../assets/categories/grundlagen.png'),
  fachinformatik: require('../../assets/categories/fachinformatik.png'),
  'it-security': require('../../assets/categories/it-security.png'),
  hardware: require('../../assets/categories/hardware.png'),
  'it-abkuerzungen': require('../../assets/categories/it-abkuerzungen.png'),
  betriebssysteme: require('../../assets/categories/betriebssysteme.png'),
};

/** The background image for a category slug, or undefined when none is registered. */
export function categoryImage(slug: string | null | undefined): ImageSourcePropType | undefined {
  if (!slug) return undefined;
  return CATEGORY_IMAGES[slug];
}
