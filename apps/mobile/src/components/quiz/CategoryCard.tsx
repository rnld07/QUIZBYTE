import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Category } from '@quizbyte/shared';

import { categoryImage } from '@/content/categoryImages';
import { categoryTagline } from '@/content/categoryTexts';
import { makeStyles, radius, spacing, tint, useGradients, useShadows, useThemeColors } from '@/theme';

import { Skeleton, Text } from '../ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface CardBadge {
  label: string;
  icon?: IoniconName;
  /** `solid` = white pill with accent text, `subtle` = translucent pill. */
  tone?: 'solid' | 'subtle';
}

interface CategoryCardProps {
  name: string;
  description: string | null;
  /** Category slug – picks the background image from `content/categoryImages`. */
  slug?: string | null;
  accentColor?: string | null;
  questionCount?: number;
  /** Renders the tile as the primary call to action (solid accent fill). */
  hero?: boolean;
  /** Visible but not playable yet: dimmed with a "Coming soon" badge. */
  comingSoon?: boolean;
  /** Pill in the top-right corner (e.g. "Beliebt"). */
  badge?: CardBadge;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * Square category tile for the 2-column grid.
 *
 * The background is either a registered category image (darkened by a scrim so
 * the label stays readable) or an accent-tinted gradient. Name and meta line sit
 * at the bottom; the hero variant uses a solid accent fill.
 */
export function CategoryCard({
  name,
  description,
  slug,
  accentColor,
  questionCount,
  hero = false,
  comingSoon = false,
  badge,
  loading,
  disabled,
  onPress,
}: CategoryCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const shadows = useShadows();
  const gradients = useGradients();
  const accent = accentColor ?? colors.primary;
  const hasQuestions = questionCount === undefined || questionCount > 0;
  // A "coming soon" tile stays tappable – it opens a hint instead of a quiz.
  const isDisabled = comingSoon ? false : disabled || !hasQuestions;
  const dimmed = comingSoon || !hasQuestions;
  const image = categoryImage(slug);
  const onLight = hero || Boolean(image);
  const tagline = categoryTagline(slug, description);
  const visibleBadge: CardBadge | undefined = comingSoon ? { label: 'Coming soon', tone: 'subtle' } : badge;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={comingSoon ? `${name} – Coming soon` : `${name} Quiz starten`}
      accessibilityHint={description ?? undefined}
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      style={({ pressed }) => [
        styles.card,
        hero ? shadows.hero : shadows.tile,
        { borderColor: dimmed ? colors.border : hero ? `${accent}80` : `${accent}${tint.line}` },
        dimmed && styles.muted,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {/* Fill layers live in their own clipping view so the iOS drop shadow
          on the pressable itself is not clipped away. */}
      <View style={styles.fillClip}>
        <LinearGradient
          colors={hero ? gradients.hero : [`${accent}${tint.faint}`, gradients.surface[0], gradients.surface[1]]}
          locations={hero ? [0, 0.55, 1] : [0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {image ? (
          <>
            <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            {/* Scrim – keeps the label readable on any artwork */}
            <LinearGradient colors={gradients.scrim} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          </>
        ) : null}

        {dimmed ? <View style={styles.dim} /> : null}

        {/* Hairline highlight along the top edge */}
        <LinearGradient colors={gradients.edge} style={styles.edge} />
      </View>

      {/* Badge row */}
      <View style={styles.topRow}>
        {loading ? (
          <ActivityIndicator color={onLight ? colors.white : accent} />
        ) : (
          <View style={styles.badgeSlot}>{visibleBadge ? <Badge {...visibleBadge} accent={accent} /> : null}</View>
        )}
      </View>

      {/* Title + tagline */}
      <View style={styles.texts}>
        <Text numberOfLines={2} style={[styles.name, onLight && styles.nameOnLight]}>
          {name}
        </Text>
        {tagline ? (
          <Text variant="label" numberOfLines={2} style={[styles.meta, onLight && styles.metaOnLight]}>
            {tagline}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Corner pill – solid white for highlights, translucent for muted states. */
function Badge({ label, icon, tone = 'subtle', accent }: CardBadge & { accent: string }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const solid = tone === 'solid';
  return (
    <View style={[styles.badge, solid ? styles.badgeSolid : styles.badgeSubtle]}>
      {icon ? <Ionicons name={icon} size={11} color={solid ? accent : colors.textSecondary} /> : null}
      <Text variant="label" numberOfLines={1} style={[styles.badgeText, solid && { color: accent }]}>
        {label}
      </Text>
    </View>
  );
}

export function CategoryCardSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonTexts}>
        <Skeleton width="75%" height={16} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

export function categoryToCardProps(category: Category) {
  return {
    name: category.name,
    description: category.description,
    slug: category.slug,
    accentColor: category.accentColor,
    questionCount: category.publishedQuestionCount,
  };
}

/**
 * Grid sizing – two tiles per row.
 * `47%` leaves room for the row gap; `flexGrow` then fills the remainder, while
 * `maxWidth` keeps a lone last tile from stretching across the whole row.
 */
const tileSize = {
  flexBasis: '47%' as const,
  flexGrow: 1,
  maxWidth: '48%' as const,
  aspectRatio: 1,
};

const useStyles = makeStyles((colors, shadows, gradients) => ({
  card: {
    ...tileSize,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xxl,
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Sits inside the 1px border, hence the slightly smaller radius.
    borderRadius: radius.xxl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 11, 20, 0.82)',
  },
  /** Coming soon / no questions: no coloured shadow, no lift. */
  muted: { shadowOpacity: 0.2, shadowColor: '#000000', elevation: 2, opacity: 0.72 },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.9 },
  disabled: { opacity: 0.45 },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 24,
  },
  /* Pushes the pill to the right without stretching it. */
  badgeSlot: { flex: 1, alignItems: 'flex-end' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeSolid: {
    backgroundColor: colors.white,
  },
  badgeSubtle: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textSecondary,
  },
  texts: { gap: spacing.xs },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  nameOnLight: { color: colors.white },
  meta: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
    color: colors.textMuted,
  },
  metaOnLight: { color: 'rgba(255, 255, 255, 0.82)' },
  skeleton: {
    ...tileSize,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
  },
  skeletonTexts: { gap: spacing.sm },
}));
