import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { makeStyles, radius, useThemeColors } from '@/theme';

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
  color,
  trackColor,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  // The defaults come from the theme, so they cannot sit in the signature.
  const fill = color ?? colors.primary;
  const track = trackColor ?? colors.border;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View
      style={[styles.track, { height, backgroundColor: track, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: fill, borderRadius: height / 2 }]} />
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.full },
  fill: { height: '100%' },}));
