import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme';

import { Text } from '../ui/Text';

/**
 * Central logo component. The asset below is a PLACEHOLDER – replace
 * `assets/brand/logo.png` with the final QuizByte logo and nothing else changes.
 * App icon / splash are configured in app.json (assets/images/*).
 */
const LOGO_SOURCE = require('../../../assets/brand/logo.png');

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
}

export function Logo({ size = 40, showWordmark = false }: LogoProps) {
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="QuizByte">
      <Image source={LOGO_SOURCE} style={{ width: size, height: size, borderRadius: radius.md }} contentFit="contain" />
      {showWordmark ? <Text variant="headline">QuizByte</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
