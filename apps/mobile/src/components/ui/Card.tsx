import type { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { makeStyles, radius, spacing } from '@/theme';

interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: keyof typeof spacing;
  /** Reads the card out as one thing, for cards whose parts make no sense alone. */
  accessibilityLabel?: string;
}

/** Surface container with the QuizByte card look. */
export function Card({ children, style, elevated = false, padding = 'lg', accessibilityLabel }: CardProps) {
  const styles = useStyles();
  return (
    <View
      style={[styles.card, elevated && styles.elevated, { padding: spacing[padding] }, style]}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined}
    >
      {children}
    </View>
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
  const styles = useStyles();
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

const useStyles = makeStyles((colors, shadows, gradients) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: { backgroundColor: colors.surfaceElevated },
  pressed: { backgroundColor: colors.surfacePressed, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.55 },
}));
