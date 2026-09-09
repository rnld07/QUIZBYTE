import { Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';

import { colors, typography } from '@/theme';
import type { TypographyVariant } from '@/theme';

export type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'success' | 'danger' | 'inverse';

const COLOR_MAP: Record<TextColor, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  accent: colors.primary,
  success: colors.success,
  danger: colors.danger,
  inverse: colors.background,
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

/** Themed text – the only place font styles are defined. */
export function Text({ variant = 'body', color = 'primary', align, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      // Dynamic type is supported but capped so layouts stay intact.
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 1.3}
      style={[typography[variant], { color: COLOR_MAP[color] }, align ? { textAlign: align } : null, style]}
    />
  );
}
