import type { AccuracyTone } from '@quizbyte/shared';

/**
 * QuizByte design tokens. Every component reads colours, spacing and type styles
 * from here – never hard-code values in components.
 *
 * Colours, gradients and shadows depend on the active theme and are therefore
 * NOT exported as plain objects: components get them from `useTheme` /
 * `makeStyles` (see `ThemeProvider`). Spacing, radii and type are the same in
 * both themes and can be imported directly.
 */

/** The dark theme – QuizByte's default look. */
export const darkColors = {
  /** Deep navy – the true app background. */
  background: '#03080F',
  /** Card / surface background. */
  surface: '#0B1728',
  /** Slightly elevated surface. */
  surfaceElevated: '#0E1C30',
  /** Pressed state. */
  surfacePressed: '#122035',
  /** Opaque surface for cards that sit on a coloured backdrop (quiz screen). */
  surfaceRaised: '#142440',
  /**
   * The question and its answer options.
   *
   * A token of their own rather than `surfaceRaised`: they sit on the
   * category-tinted backdrop and are the only thing being read, so they take
   * the strongest contrast the theme has. Everything else on `surfaceRaised` –
   * the sheets, the progress cards – stays as it was.
   */
  quizSurface: '#08090C',
  /** Subtle blue-tinted border. */
  border: 'rgba(55, 125, 210, 0.22)',
  /** Stronger border for emphasis. */
  borderStrong: 'rgba(55, 125, 210, 0.40)',

  textPrimary: '#F5F7FC',
  textSecondary: '#A8B5CC',
  textMuted: '#627088',

  /** Bright blue – primary accent. */
  primary: '#1E8FFF',
  primaryStrong: '#0072F0',
  primarySoft: 'rgba(30, 143, 255, 0.14)',

  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.14)',

  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.14)',

  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.14)',

  overlay: 'rgba(0, 0, 0, 0.65)',
  /** Tint laid over the tab bar's blur – see FloatingTabBar. */
  barFill: 'rgba(14, 28, 48, 0.55)',
  /** The highlight that slides between the tab bar items. */
  barHighlight: 'rgba(255, 255, 255, 0.08)',
  /**
   * The "Neu" / "Schon beantwortet" badge on the question card. It sits on an
   * opaque card, so it needs its own values: on the white card of the light
   * theme a white badge would have no edge at all, and the "seen" variant would
   * not read as muted.
   */
  badgeNewBorder: '#FFFFFF',
  badgeSeenFill: '#0E1C30',
  badgeSeenBorder: 'rgba(55, 125, 210, 0.22)',
  /** Always white, in both themes – used on coloured fills. */
  white: '#FFFFFF',
} as const;

export type ThemeColors = { readonly [K in keyof typeof darkColors]: string };

/**
 * The light theme.
 *
 * Only the surfaces that were plain dark turn light: background, cards, borders
 * and text. Everything that carries colour – the blue accent, the traffic-light
 * colours, the per-category accents and the tile artwork – is left exactly as it
 * is, so the app keeps its identity instead of becoming a second design.
 */
export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F4F7FB',
  surfaceElevated: '#FFFFFF',
  surfacePressed: '#E9EFF7',
  surfaceRaised: '#FFFFFF',
  // White in the light theme: a black card there would be the odd one out.
  quizSurface: '#FFFFFF',
  border: 'rgba(15, 40, 75, 0.12)',
  borderStrong: 'rgba(15, 40, 75, 0.24)',

  textPrimary: '#0B1728',
  textSecondary: '#48596F',
  textMuted: '#7B8797',

  primary: '#1E8FFF',
  primaryStrong: '#0072F0',
  primarySoft: 'rgba(30, 143, 255, 0.12)',

  success: '#16A34A',
  successSoft: 'rgba(22, 163, 74, 0.12)',

  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.10)',

  warning: '#D97706',
  warningSoft: 'rgba(217, 119, 6, 0.12)',

  overlay: 'rgba(11, 23, 40, 0.45)',
  barFill: 'rgba(255, 255, 255, 0.55)',
  barHighlight: 'rgba(11, 23, 40, 0.07)',
  badgeNewBorder: 'rgba(30, 143, 255, 0.45)',
  badgeSeenFill: '#E9EFF7',
  badgeSeenBorder: 'rgba(15, 40, 75, 0.16)',
  white: '#FFFFFF',
};

/**
 * Layered gradients. The dark theme gets its depth from these rather than from
 * flat fills; the light theme keeps the same structure with light values.
 */
export const darkGradients = {
  /** Page backdrop: navy that lifts slightly towards the top of the screen. */
  screen: ['#071322', '#040C15', '#03080F'] as const,
  /** Accent halo behind the header. */
  halo: ['rgba(30, 143, 255, 0.18)', 'rgba(30, 143, 255, 0.05)', 'rgba(3, 8, 15, 0)'] as const,
  /** Neutral card surface with a soft top highlight. */
  surface: ['#13233A', '#0A1524'] as const,
  /**
   * Eine Karte, die tiefer liegen soll als die anderen.
   *
   * Dunkler als `surface`, aber weiterhin Marineblau und nicht das neutrale
   * Fast-Schwarz der Dialoge – die läge auf der Seite wie ein Fremdkörper.
   */
  surfaceDeep: ['#0C1B2E', '#050D18'] as const,
  /**
   * Dialog surface: near-black, but two stops apart so the card still has a
   * top and a bottom instead of reading as one flat rectangle.
   */
  dialog: ['#161A21', '#080A0E'] as const,
  /** Primary call-to-action fill. */
  hero: ['#4BA5FF', '#1E8FFF', '#0A63D6'] as const,
  /** A card whose moment has passed: grey, not the navy of a normal surface. */
  muted: ['#2A3038', '#1A1E25'] as const,
  /** Hairline highlight along the top edge of a card. */
  edge: ['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0)'] as const,
  /** Darkens a background image from the bottom so labels stay readable. */
  scrim: ['rgba(5, 11, 20, 0.10)', 'rgba(5, 11, 20, 0.55)', 'rgba(5, 11, 20, 0.88)'] as const,
} as const;

export type ThemeGradients = { readonly [K in keyof typeof darkGradients]: readonly [string, string] | readonly [string, string, string] };

export const lightGradients: ThemeGradients = {
  screen: ['#FFFFFF', '#F7FAFD', '#F1F5FA'] as const,
  halo: ['rgba(30, 143, 255, 0.14)', 'rgba(30, 143, 255, 0.04)', 'rgba(255, 255, 255, 0)'] as const,
  surface: ['#FFFFFF', '#F3F7FC'] as const,
  // Im hellen Thema heißt "tiefer" etwas grauer statt dunkler.
  surfaceDeep: ['#EDF2F9', '#DFE7F1'] as const,
  // Dialogs are dark whatever the theme – they render inside a fixed dark
  // scheme – so this is the same near-black as above.
  dialog: ['#161A21', '#080A0E'] as const,
  hero: ['#4BA5FF', '#1E8FFF', '#0A63D6'] as const,
  muted: ['#EDEFF2', '#E2E6EB'] as const,
  edge: ['rgba(15, 40, 75, 0.10)', 'rgba(15, 40, 75, 0)'] as const,
  // Unchanged: the category artwork stays as it is, and its labels still need
  // a dark foot to stay readable.
  scrim: ['rgba(5, 11, 20, 0.10)', 'rgba(5, 11, 20, 0.55)', 'rgba(5, 11, 20, 0.88)'] as const,
};

export const darkShadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  /** Deeper, softer drop for the elevated tiles on the start screen. */
  tile: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  /** Coloured glow for the primary tile. */
  hero: {
    shadowColor: '#1E8FFF',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const;

export type ThemeShadows = {
  readonly [K in keyof typeof darkShadows]: {
    readonly shadowColor: string;
    readonly shadowOpacity: number;
    readonly shadowRadius: number;
    readonly shadowOffset: { readonly width: number; readonly height: number };
    readonly elevation: number;
  };
};

/** The same drops, but far lighter – a dark shadow on white reads as dirt. */
export const lightShadows: ThemeShadows = {
  card: {
    shadowColor: '#0B1728',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tile: {
    shadowColor: '#0B1728',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  hero: {
    shadowColor: '#1E8FFF',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

/** Traffic-light colours for an accuracy band: rot < 34 %, gelb 34-66 %, gruen > 66 %. */
export function accuracyColorsFor(colors: ThemeColors): Record<AccuracyTone, string> {
  return { low: colors.danger, mid: colors.warning, high: colors.success };
}

/**
 * The colours of the first three places, wherever something is ranked.
 *
 * Fixed rather than theme-dependent: gold, silver and bronze are the same
 * metals in both themes, and a ranking that changed colour with the theme
 * would stop reading as one.
 */
export const PLACE_COLORS: Record<number, string> = { 1: '#F1B434', 2: '#A9B4C2', 3: '#C77B48' };

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

export const layout = {
  screenPaddingHorizontal: spacing.lg,
  maxContentWidth: 640,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Opacity suffixes for tinting an accent colour (hex + alpha). */
export const tint = {
  /** Card wash – barely there. */
  faint: '14',
  /** Icon chip fill. */
  soft: '24',
  /** Card border. */
  line: '40',
  /** Icon chip border. */
  edge: '5A',
} as const;

/** Minimum touch target size (Apple HIG / Material). */
export const touchTarget = 44;
