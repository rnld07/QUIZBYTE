import { Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';

import { typography, useThemeColors } from '@/theme';
import type { ThemeColors, TypographyVariant } from '@/theme';

export type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'success' | 'danger' | 'inverse';

/** Which token a `color` prop maps to. Resolved per theme, not at module load. */
const COLOR_KEYS: Record<TextColor, keyof ThemeColors> = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  muted: 'textMuted',
  accent: 'primary',
  success: 'success',
  danger: 'danger',
  inverse: 'background',
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

/** Themed text – the only place font styles are defined. */
export function Text({ variant = 'body', color = 'primary', align, style, ...rest }: TextProps) {
  const colors = useThemeColors();

  return (
    <RNText
      {...rest}
      // Dynamic type is supported but capped so layouts stay intact.
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 1.3}
      style={[typography[variant], { color: colors[COLOR_KEYS[color]] }, align ? { textAlign: align } : null, style]}
    />
  );
}
