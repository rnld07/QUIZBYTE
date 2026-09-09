/**
 * QuizByte design tokens. Every component reads colours, spacing and type styles
 * from here – never hard-code values in components.
 */

export const palette = {
  background: '#0B0D10',
  surface: '#14171C',
  surfaceElevated: '#1B1F26',
  surfacePressed: '#20252D',
  border: '#242932',
  borderStrong: '#2F3641',
  textPrimary: '#F2F4F7',
  textSecondary: '#A0A7B4',
  textMuted: '#6B7280',
  primary: '#3B82F6',
  primaryStrong: '#2563EB',
  primarySoft: 'rgba(59, 130, 246, 0.16)',
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.16)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.16)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
} as const;

/** The dark theme is the default (and only) theme in V1. Light mode can extend this later. */
export const colors = palette;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

/** Minimum touch target size (Apple HIG / Material). */
export const touchTarget = 44;

export const layout = {
  screenPaddingHorizontal: spacing.lg,
  maxContentWidth: 640,
} as const;
