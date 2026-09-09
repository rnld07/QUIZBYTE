import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: keyof typeof spacing;
}

/** Surface container with the QuizByte card look. */
export function Card({ children, style, elevated = false, padding = 'lg' }: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, { padding: spacing[padding] }, style]}>{children}</View>
  );
}

interface PressableCardProps extends CardProps {
  onPress: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** A whole card as touch target – no chevrons needed. */
export function PressableCard({
  children,
  style,
  elevated = false,
  padding = 'lg',
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}: PressableCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.card,
        elevated && styles.elevated,
        { padding: spacing[padding] },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  elevated: { backgroundColor: colors.surfaceElevated },
  pressed: { backgroundColor: colors.surfacePressed },
  disabled: { opacity: 0.6 },
});
