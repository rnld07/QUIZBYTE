import type { ImageSourcePropType } from 'react-native';

import type { QuizMode } from '@quizbyte/shared';

/**
 * Background images for the mode tiles on the mode selection page.
 *
 * Metro resolves `require()` at build time, so every image needs one static
 * entry here – see `assets/modes/README.md`. Drop the file into `assets/modes/`,
 * name it after the mode id, then uncomment the matching line. Modes without an
 * entry keep the accent gradient, so an empty folder breaks nothing.
 */
const MODE_IMAGES: Partial<Record<QuizMode, ImageSourcePropType>> = {
  classic: require('../../assets/modes/classic.png'),
  blitz: require('../../assets/modes/blitz.png'),
  survival: require('../../assets/modes/survival.png'),
  perfect: require('../../assets/modes/perfect.png'),
};

/** The background image for a mode, or undefined while none is registered. */
export function modeImage(mode: QuizMode): ImageSourcePropType | undefined {
  return MODE_IMAGES[mode];
}
