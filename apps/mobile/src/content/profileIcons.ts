import type { ImageSourcePropType } from 'react-native';

/** The spots on the profile and its edit page that can carry your own symbol. */
export const PROFILE_ICON_KEYS = [
  'edit',
  'username',
  'avatar',
  'breed',
  'fur',
  'glasses',
  'accessory',
  'accent',
] as const;
export type ProfileIconKey = (typeof PROFILE_ICON_KEYS)[number];

/**
 * Custom symbols for the profile.
 *
 * Metro resolves `require()` at build time, so every image needs one static
 * entry here – see `assets/icons/profile/README.md`. Drop the file into that
 * folder, name it after the key, then uncomment the matching line. A spot
 * without an entry keeps its Ionicon, so an empty folder breaks nothing.
 */
const PROFILE_ICONS: Partial<Record<ProfileIconKey, ImageSourcePropType>> = {
  edit: require('../../assets/icons/profile/edit.png'),
  username: require('../../assets/icons/profile/username.png'),
  avatar: require('../../assets/icons/profile/avatar.png'),
  breed: require('../../assets/icons/profile/breed.png'),
  fur: require('../../assets/icons/profile/fur.png'),
  glasses: require('../../assets/icons/profile/glasses.png'),
  accessory: require('../../assets/icons/profile/accessory.png'),
  accent: require('../../assets/icons/profile/accent.png'),
};

/** The registered symbol for a spot, or undefined while none is set. */
export function profileIcon(key: ProfileIconKey): ImageSourcePropType | undefined {
  return PROFILE_ICONS[key];
}
