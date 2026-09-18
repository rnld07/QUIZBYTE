import { Image } from 'expo-image';
import { View } from 'react-native';

import { darkColors, makeStyles, useTheme } from '@/theme';

import { Text } from '../ui/Text';

/**
 * The QuizByte mark.
 *
 * `logo-mark.png` is the artwork from `assets/brand/logo.png` with its dark
 * ground keyed out, so it sits on any background. Replacing `logo.png` and
 * regenerating is all it takes to change the mark everywhere; the app icon and
 * the splash screen come from the same source via `app.json` (assets/images/*).
 */
const LOGO_SOURCE = require('../../../assets/brand/logo-mark.png');

/** How much of the plate the artwork covers – the rest is breathing room. */
const ARTWORK_RATIO = 0.78;

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
}

export function Logo({ size = 40, showWordmark = false }: LogoProps) {
  const styles = useStyles();
  const { scheme } = useTheme();
  // The mark is thin, light line art: on a dark ground it stands on its own, on
  // white it would wash out. So the plate – the app icon's look – appears only
  // where it is actually needed.
  const plated = scheme === 'light';
  const artwork = plated ? Math.round(size * ARTWORK_RATIO) : size;

  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="QuizByte">
      <View style={[plated && styles.plate, { width: size, height: size, borderRadius: Math.round(size * 0.28) }]}>
        <Image source={LOGO_SOURCE} style={{ width: artwork, height: artwork }} contentFit="contain" />
      </View>
      {showWordmark ? <Text variant="headline">QuizByte</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plate: {
    alignItems: 'center',
    justifyContent: 'center',
    // Fixed to the dark palette: the plate is the app icon's own background.
    backgroundColor: darkColors.surfaceRaised,
    borderWidth: 1,
    borderColor: darkColors.borderStrong,
  },
}));
