import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ProgressBar({
  value,
  height = 6,
  color = colors.primary,
  trackColor = colors.border,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View
      style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.full },
  fill: { height: '100%' },
});
