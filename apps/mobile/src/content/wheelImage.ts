import type { ImageSourcePropType } from 'react-native';

/**
 * The face of the prize wheel, when one is supplied as a picture.
 *
 * Metro resolves `require()` at build time, so the file needs a static entry
 * here – see `assets/wheel/README.md` for what the picture has to look like.
 * Uncomment the second line once it is in the folder; until then the wheel is
 * drawn from the segments themselves, which always matches what is paid out.
 */
// const WHEEL_FACE: ImageSourcePropType | undefined = undefined;
const WHEEL_FACE: ImageSourcePropType = require('../../assets/wheel/wheel.png');

/** The registered wheel face, or undefined while none is set. */
export function wheelFaceImage(): ImageSourcePropType | undefined {
  return WHEEL_FACE;
}
