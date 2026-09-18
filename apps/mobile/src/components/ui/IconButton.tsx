import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import type { PressableProps } from 'react-native';

import { makeStyles, radius, touchTarget, useThemeColors } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface IconButtonProps {
  icon: IoniconName;
  onPress: PressableProps['onPress'];
  accessibilityLabel: string;
  size?: number;
  color?: string;
  disabled?: boolean;
}

/** Icon-only button with a guaranteed 44×44 touch target. */
export function IconButton({ icon, onPress, accessibilityLabel, size = 24, color, disabled }: IconButtonProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.textPrimary} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfacePressed },
  disabled: { opacity: 0.4 },}));
