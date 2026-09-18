import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LevelProgress } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { statIcon } from '@/content/statIcons';

import { AppIcon, Card, ProgressRing, Skeleton, Text } from '../ui';

interface LevelCardProps {
  level: LevelProgress | null;
  /** Total questions answered so far. */
  questionsAnswered: number;
  /** Share of correct answers, 0–100. */
  accuracy: number;
  streak: number;
  loading?: boolean;
  /** Opens the detailed analysis. */
  onPress?: () => void;
}

/** The level ring's own green – brighter than the palette's, which is tuned for text. */
const RING_GREEN = '#3DE07E';

const RING_SIZE = 140;
const RING_STROKE = 11;

export function LevelCard({ level, questionsAnswered, accuracy, streak, loading, onPress }: LevelCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  if (loading || !level) {
    return (
      <Card elevated style={styles.skeletonCard}>
        <View style={styles.row}>
          <Skeleton width={RING_SIZE} height={RING_SIZE} borderRadius={RING_SIZE / 2} />
          <View style={styles.statsCol}>
            <Skeleton width={80} height={22} />
            <Skeleton width={100} height={22} />
            <Skeleton width={90} height={22} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Level ${level.level}, ${questionsAnswered} Fragen beantwortet, ${accuracy} Prozent richtig`}
      accessibilityHint={onPress ? 'Öffnet die detaillierte Analyse' : undefined}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Depth layers: gradient fill, accent bloom behind the ring, top hairline */}
      <View style={styles.fillClip}>
        {/* Tiefer als die Karten darunter: es ist der Kopf der Seite, und ein
            Kopf, der genauso hell ist wie alles andere, ist keiner. */}
        <LinearGradient colors={gradients.surfaceDeep} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={gradients.edge} style={styles.edge} />
      </View>

      <View style={styles.row}>
        {/* Circular level ring – empty at 0 XP into the level, closed on level-up */}
        <ProgressRing
          value={level.progressPercent}
          size={RING_SIZE}
          stroke={RING_STROKE}
          color={RING_GREEN}
          accessibilityLabel={`Level ${level.level}, ${level.progressPercent} Prozent bis Level ${level.level + 1}`}
        >
          <Text variant="label" color="secondary" style={styles.ringLabel}>
            LEVEL
          </Text>
          <Text style={styles.ringNumber}>{level.level}</Text>
          <Text variant="caption" color="secondary" style={styles.ringXp}>
            {level.xpIntoLevel} / {level.xpForLevel}
          </Text>
        </ProgressRing>

        {/* Stats column */}
        <View style={styles.statsCol}>
          {/* Streak */}
          <View style={styles.statRow} accessibilityLabel={`${streak} Tage Streak`}>
            <AppIcon
              source={statIcon('streak')}
              fallback="flame"
              size={24}
              glyphSize={20}
              color={streak > 0 ? colors.danger : colors.textMuted}
            />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text variant="caption" color="secondary">
                {streak === 1 ? 'Tag Streak' : 'Tage Streak'}
              </Text>
            </View>
          </View>

          {/* Questions answered */}
          <View style={styles.statRow} accessibilityLabel={`${questionsAnswered} Fragen beantwortet`}>
            <AppIcon source={statIcon('answered')} fallback="help" size={24} glyphSize={20} color={colors.primary} />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{questionsAnswered}</Text>
              <Text variant="caption" color="secondary" numberOfLines={1}>
                beantwortet
              </Text>
            </View>
          </View>

          {/* Correct answers */}
          <View style={styles.statRow} accessibilityLabel={`${accuracy} Prozent richtig beantwortet`}>
            <AppIcon source={statIcon('correct')} fallback="trophy" size={24} glyphSize={20} color={colors.warning} />
            <View style={styles.statText}>
              <Text style={styles.statValue}>{accuracy} %</Text>
              <Text variant="caption" color="secondary" numberOfLines={1}>
                Quote
              </Text>
            </View>
          </View>
        </View>
      </View>

    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  card: {
    ...shadows.tile,
    gap: spacing.lg,
    // Mehr Luft oben und unten als seitlich: flach gedrückt sah die Karte aus
    // wie eine Zeile mit einem Ring darin statt wie der Kopf der Seite.
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  skeletonCard: { gap: spacing.lg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xxl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },

  /* Ring content */
  ringLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  ringNumber: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    color: colors.textPrimary,
    lineHeight: 46,
  },
  ringXp: {
    fontSize: 11,
  },

  /* Stats column */
  statsCol: { flex: 1, gap: spacing.md },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statText: { flex: 1 },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
  },
}));
