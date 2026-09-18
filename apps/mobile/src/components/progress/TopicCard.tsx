import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { accuracyTone } from '@quizbyte/shared';

import { categoryImage } from '@/content/categoryImages';
import { makeStyles, PLACE_COLORS, radius, spacing, useAccuracyColors, useThemeColors } from '@/theme';

import { Text } from '../ui';

interface TopicCardProps {
  label: string;
  accuracy: number;
  attempts: number;
  /** Of those attempts, how many were right. */
  correct: number;
  /** Where this category stands in the list – 1 is your strongest. */
  rank: number;
  /** Accent colour from the category. */
  accentColor?: string | null;
  /** Category slug – picks the artwork behind the card. */
  slug?: string | null;
  /** Makes the card tappable. */
  onPress?: () => void;
}

/** Width of one card in the row. Two and a bit fit on screen, which is the hint to swipe. */
export const TOPIC_CARD_WIDTH = 136;

/**
 * One category, as a card in a swipeable row.
 *
 * Side by side rather than stacked: the section is a ranking, and a ranking of
 * a dozen topics that runs down the page pushes everything under it off the
 * screen. A row costs one card's height however many categories there are, and
 * the half-card at the right edge says there are more.
 *
 * The figure leads. Everything else on the card is there to say what the figure
 * belongs to.
 */
export function TopicCard({ label, accuracy, attempts, correct, rank, accentColor, slug, onPress }: TopicCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColors = useAccuracyColors();
  const played = attempts > 0;
  // Unplayed categories stay grey – 0 % there means "no data", not "bad".
  const tone = played ? accuracyColors[accuracyTone(accuracy)] : colors.textMuted;
  const accent = accentColor ?? colors.primary;
  const place = played ? PLACE_COLORS[rank] : undefined;
  const image = categoryImage(slug);
  // The artwork is a module id, which is a number – and a falsy number in a
  // style array is not a style. Ask the question once, as a boolean.
  const onImage = image !== undefined;

  const content = (
    <>
      {/* The topic's own picture behind the figures – the same one it wears on
          the home screen, so a category looks like itself wherever you meet it.
          Heavily darkened: this card is read, not looked at. */}
      {image ? (
        <View style={styles.fillClip}>
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
          <LinearGradient
            colors={['rgba(3, 7, 13, 0.62)', 'rgba(3, 7, 13, 0.82)', 'rgba(3, 7, 13, 0.94)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {!played ? <View style={styles.dim} /> : null}
        </View>
      ) : null}

      {/* The place, on top and in the middle. Every rank, not just the medals:
          a ranking that stops counting at three is a podium, and this is a
          list you read to the end. */}
      <Text style={[styles.place, place ? { color: place } : null]}>{played ? `${rank}.` : ''}</Text>

      {/* Bar and name at the foot of the card, the figure at its head: the
          picture behind them needs somewhere to be seen. */}
      <View style={styles.foot}>
        <View style={styles.scoreBox}>
          <Text style={[styles.percent, { color: tone }]}>{played ? accuracy : '–'}</Text>
          {played ? <Text style={[styles.percentSign, { color: tone }]}>%</Text> : null}
        </View>

        <View style={[styles.track, { backgroundColor: `${accent}2E` }]}>
          <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, played ? accuracy : 0))}%`, backgroundColor: tone }]} />
        </View>

        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={2} style={[styles.label, onImage && styles.labelOnImage]}>
            {label}
          </Text>
          <Text
            variant="label"
            color={onImage ? undefined : 'muted'}
            numberOfLines={1}
            style={onImage ? styles.metaOnImage : undefined}
          >
            {played ? `${correct}/${attempts} richtig` : 'Noch nicht gespielt'}
          </Text>
        </View>
      </View>
    </>
  );

  const description = played
    ? `Platz ${rank}, ${label}: ${correct} von ${attempts} Fragen richtig, ${accuracy} Prozent`
    : `${label}: noch nicht gespielt`;

  if (!onPress) {
    return (
      <View style={[styles.card, { borderColor: `${accent}3D` }]} accessibilityLabel={description}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={description}
      accessibilityHint="Zeigt die Details der Kategorie"
      style={({ pressed }) => [styles.card, { borderColor: `${accent}3D` }, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  card: {
    ...shadows.tile,
    width: TOPIC_CARD_WIDTH,
    // Fixed height with the two halves pushed apart, so every card in the row
    // carries its name on the same line.
    height: 150,
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  // Its own clipping view, so the rounded corners hold without cutting the
  // drop shadow off the card itself.
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3, 7, 13, 0.45)' },

  scoreBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 1 },
  percent: { fontSize: 18, fontWeight: '900', lineHeight: 21 },
  percentSign: { fontSize: 10, fontWeight: '800' },
  place: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'center',
    color: colors.textMuted,
  },

  track: { height: 5, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },

  foot: { gap: 5 },
  // Room for two lines of name, so a short one and a long one still end at the
  // same edge.
  texts: { gap: 1, minHeight: 50, justifyContent: 'flex-end' },
  label: { fontSize: 16, lineHeight: 19, letterSpacing: -0.2, color: colors.textPrimary },
  labelOnImage: { color: '#FFFFFF' },
  metaOnImage: { color: 'rgba(255, 255, 255, 0.72)' },
}));
