import type { ImageSourcePropType } from 'react-native';

/** The spots that can carry your own symbol instead of an Ionicon. */
export const APP_ICON_KEYS = ['study-sheets', 'repeat-questions', 'invite-friends', 'coming-soon', 'settings'] as const;
export type AppIconKey = (typeof APP_ICON_KEYS)[number];

/**
 * Custom symbols for single spots in the app.
 *
 * Metro resolves `require()` at build time, so every image needs one static
 * entry here – see `assets/icons/README.md`. Drop the file into `assets/icons/`,
 * name it after the key, then uncomment the matching line. A spot without an
 * entry keeps its Ionicon, so an empty folder breaks nothing.
 */
const APP_ICONS: Partial<Record<AppIconKey, ImageSourcePropType>> = {
  'study-sheets': require('../../assets/icons/study-sheets.png'),
  'repeat-questions': require('../../assets/icons/repeat-questions.png'),
  'invite-friends': require('../../assets/icons/invite-friends.png'),
  'coming-soon': require('../../assets/icons/coming-soon.png'),
  // Header button, top left only – the "Einstellungen" row under "Mehr" and the
  // one inside a running quiz keep their Ionicon.
  settings: require('../../assets/icons/settings.png'),
};

/** The registered symbol for a spot, or undefined while none is set. */
export function appIcon(key: AppIconKey): ImageSourcePropType | undefined {
  return APP_ICONS[key];
}
