import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

import { appIcon } from '@/content/appIcons';
import type { AppIconKey } from '@/content/appIcons';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface AppIconProps {
  /** The spot – decides which registered image is used. */
  name?: AppIconKey;
  /**
   * A registered image from somewhere other than the app-icon registry.
   *
   * Used by the profile, which keeps its own folder and its own keys; passing
   * the source straight in beats a second copy of this component.
   */
  source?: ImageSourcePropType;
  /** Drawn while no image is registered for the spot. */
  fallback: IoniconName;
  /** Size of the custom image. */
  size?: number;
  /**
   * Size of the fallback glyph, when it should differ.
   *
   * Artwork carries its own padding and wants to fill its spot; an Ionicon is
   * drawn edge to edge and looks blown up at the same number.
   */
  glyphSize?: number;
  /** Only the fallback glyph is tinted; a custom image keeps its own colours. */
  color?: string;
}

/**
 * A spot that can carry a custom symbol.
 *
 * Falls back to the Ionicon it had before, so dropping a file into
 * `assets/icons/` is the only step needed to change one – and forgetting to
 * does nothing worse than leaving the old icon in place.
 */
export function AppIcon({ name, source, fallback, size = 20, glyphSize, color }: AppIconProps) {
  const image = source ?? (name ? appIcon(name) : undefined);
  if (!image) return <Ionicons name={fallback} size={glyphSize ?? size} color={color} />;

  // `contain`, not `cover`: a symbol must not be cropped to fill the box.
  return <Image source={image} style={{ width: size, height: size }} contentFit="contain" cachePolicy="memory-disk" />;
}
