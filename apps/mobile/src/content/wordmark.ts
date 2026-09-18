import type { ImageSourcePropType } from 'react-native';

/**
 * The QuizByte lettering in the app header.
 *
 * Metro resolves `require()` at build time, so the file needs this static entry
 * – see `assets/wordmark/README.md`. Uncomment the line once the image is in
 * the folder; until then the header keeps the typeset "QuizByte".
 */
// const WORDMARK: ImageSourcePropType | undefined = undefined;
const WORDMARK: ImageSourcePropType = require('../../assets/wordmark/wordmark.png');

/** The registered lettering, or undefined while none is set. */
export function wordmarkImage(): ImageSourcePropType | undefined {
  return WORDMARK;
}
