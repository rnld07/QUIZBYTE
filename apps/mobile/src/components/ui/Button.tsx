import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, touchTarget, useThemeColors } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: PressableProps['onPress'];
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, accessibilityLabel }: ButtonProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const isDisabled = Boolean(disabled || loading);
  const textColor = variant === 'primary' || variant === 'danger' ? 'inverse' : variant === 'ghost' ? 'accent' : 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.background : colors.textPrimary} />
      ) : (
        <Text variant="bodyStrong" color={textColor === 'inverse' ? 'inverse' : textColor}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  base: {
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },}));
