import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { categoryImage } from '@/content/categoryImages';
import { makeStyles, radius, useThemeColors } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const FALLBACK_ICON: IoniconName = 'ellipse-outline';

function resolveIcon(icon: string | null | undefined): IoniconName {
  if (icon && icon in Ionicons.glyphMap) return icon as IoniconName;
  return FALLBACK_ICON;
}

interface CategoryBadgeProps {
  /** Picks the registered category artwork. */
  slug?: string | null;
  /** Fallback glyph when no image is registered for the slug. */
  icon?: string | null;
  accentColor?: string | null;
  size?: number;
  /** Dims the badge for categories that have not been played. */
  muted?: boolean;
}

/**
 * Square category marker: the category image when one is registered, otherwise
 * the tinted Ionicon it used before.
 */
export function CategoryBadge({ slug, icon, accentColor, size = 32, muted }: CategoryBadgeProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const accent = accentColor ?? colors.primary;
  const image = categoryImage(slug);

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, backgroundColor: `${accent}1A`, borderColor: `${accent}40` },
        muted && styles.muted,
      ]}
    >
      {image ? (
        <Image source={image} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={120} />
      ) : (
        <Ionicons name={resolveIcon(icon)} size={Math.round(size * 0.5)} color={muted ? colors.textMuted : accent} />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: { width: '100%', height: '100%' },
  muted: { opacity: 0.5 },
}));
