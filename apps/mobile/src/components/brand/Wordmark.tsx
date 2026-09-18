import { Image } from 'expo-image';
import { Image as RNImage } from 'react-native';

import { wordmarkImage } from '@/content/wordmark';
import { makeStyles } from '@/theme';

import { Text } from '../ui/Text';

/** How tall your own lettering is. The typeset fallback keeps its own metrics. */
const HEIGHT = 34;

/**
 * How wide it may get.
 *
 * The header is a fixed row – two 50 pt buttons and the brand between them –
 * and the logo mark takes its share of what is left. Past this the lettering
 * would push into the profile button, so a very wide file is fitted by width
 * instead and comes out shorter than `HEIGHT`.
 */
const MAX_WIDTH = 150;

/**
 * "QuizByte" in the header: your own lettering when one is registered,
 * otherwise the typeset one.
 *
 * The width comes from the file itself. A lettering is wide and every one is
 * wide differently, so a fixed width would either squash it or leave a gap;
 * `resolveAssetSource` reads the bundled file's own size and the height does
 * the rest.
 */
export function Wordmark() {
  const styles = useStyles();
  const source = wordmarkImage();

  if (!source) {
    return (
      <Text style={styles.text} accessibilityRole="header">
        Quiz<Text style={styles.accent}>Byte</Text>
      </Text>
    );
  }

  const asset = RNImage.resolveAssetSource(source);
  const ratio = asset && asset.height > 0 ? asset.width / asset.height : 4;
  // Width first, then the height that goes with it: clamping only the width
  // would squash the lettering, so the shape always wins over the size.
  const width = Math.min(Math.round(HEIGHT * ratio), MAX_WIDTH);

  return (
    <Image
      source={source}
      style={{ width, height: Math.round(width / ratio) }}
      contentFit="contain"
      accessibilityRole="header"
      accessibilityLabel="QuizByte"
    />
  );
}

const useStyles = makeStyles((colors) => ({
  text: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  accent: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: colors.primary,
  },
}));
