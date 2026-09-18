import type { ImageSourcePropType } from 'react-native';

/**
 * Symbol for the daily quiz card on the start screen.
 *
 * Metro resolves `require()` at build time, so the file needs this static entry
 * – see `assets/daily/README.md`. Uncomment the line once the image is in the
 * folder; until then the card keeps its calendar glyph.
 */
// const DAILY_IMAGE: ImageSourcePropType | undefined = undefined;
const DAILY_IMAGE: ImageSourcePropType = require('../../assets/daily/daily.png');

/** The registered daily-quiz symbol, or undefined while none is set. */
export function dailyImage(): ImageSourcePropType | undefined {
  return DAILY_IMAGE;
}
