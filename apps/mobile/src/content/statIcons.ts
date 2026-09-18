import type { ImageSourcePropType } from 'react-native';

/**
 * The figures that can carry your own symbol.
 *
 * Keyed by what the number means, not by the screen it is on: "XP gesamt"
 * appears in the analysis, on the profile and on a friend's profile, and one
 * picture should serve all three.
 */
export const STAT_ICON_KEYS = [
  'xp',
  'streak',
  'correct',
  'wrong',
  'accuracy',
  'answered',
  'sessions',
  'perfect',
  'duels',
  'highscore',
] as const;
export type StatIconKey = (typeof STAT_ICON_KEYS)[number];

/**
 * Custom symbols for the statistics.
 *
 * Metro resolves `require()` at build time, so every image needs one static
 * entry here – see `assets/icons/stats/README.md`. Drop the file into that
 * folder, name it after the key, then uncomment the matching line. A figure
 * without an entry keeps its Ionicon, so an empty folder breaks nothing.
 */
const STAT_ICONS: Partial<Record<StatIconKey, ImageSourcePropType>> = {
  xp: require('../../assets/icons/stats/xp.png'),
  streak: require('../../assets/icons/stats/streak.png'),
  correct: require('../../assets/icons/stats/correct.png'),
  wrong: require('../../assets/icons/stats/wrong.png'),
  duels: require('../../assets/icons/stats/duels.png'),
  highscore: require('../../assets/icons/stats/highscore.png'),
  accuracy: require('../../assets/icons/stats/accuracy.png'),
  answered: require('../../assets/icons/stats/answered.png'),
  sessions: require('../../assets/icons/stats/sessions.png'),
  perfect: require('../../assets/icons/stats/perfect.png'),
};

/** The registered symbol for a figure, or undefined while none is set. */
export function statIcon(key: StatIconKey): ImageSourcePropType | undefined {
  return STAT_ICONS[key];
}
