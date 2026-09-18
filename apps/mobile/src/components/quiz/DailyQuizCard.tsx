import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { quizConfig, xpConfig } from '@quizbyte/shared';

import { dailyImage } from '@/content/dailyImage';
import { makeStyles, radius, spacing, useGradients, useShadows, useThemeColors } from '@/theme';

import { Text } from '../ui';

interface DailyQuizCardProps {
  /** Today's round is already finished. */
  done: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Wide call-to-action above the category grid: five questions, double XP. */
export function DailyQuizCard({ done, loading, disabled, onPress }: DailyQuizCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const shadows = useShadows();
  const gradients = useGradients();
  // One round a day – afterwards the card just reports the state.
  const blocked = Boolean(disabled);
  const image = dailyImage();

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={
        done ? 'Daily Quiz – heute erledigt, Ergebnis ansehen' : `Daily Quiz, ${quizConfig.DAILY_QUIZ_LENGTH} Fragen, doppelte XP`
      }
      accessibilityState={{ disabled: blocked }}
      style={({ pressed }) => [
        styles.card,
        done ? styles.cardDone : null,
        done ? shadows.tile : shadows.hero,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.fillClip}>
        <LinearGradient
          // Done for today: a plain grey fill instead of the accent. The card is
          // no longer an invitation, it is a receipt.
          colors={done ? gradients.muted : gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={gradients.edge} style={styles.edge} />
      </View>

      <View style={[styles.icon, done && styles.iconDone]}>
        {loading ? (
          <ActivityIndicator color={done ? colors.textSecondary : colors.white} />
        ) : image ? (
          <Image source={image} style={[styles.iconImage, done && styles.iconImageDone]} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <Ionicons name={done ? 'checkmark-done' : 'calendar'} size={24} color={done ? colors.textSecondary : colors.white} />
        )}
      </View>

      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, done && styles.titleDone]}>Daily Quiz</Text>
          <View style={[styles.badge, done && styles.badgeDone]}>
            <Ionicons name="flash" size={11} color={done ? colors.textMuted : colors.primaryStrong} />
            <Text variant="label" style={[styles.badgeText, done && styles.badgeTextDone]}>
              {xpConfig.DAILY_XP_MULTIPLIER}× XP
            </Text>
          </View>
        </View>
        <Text variant="label" numberOfLines={1} style={[styles.subtitle, done && styles.subtitleDone]}>
          {done
            ? 'Heute erledigt – Ergebnis ansehen'
            : `${quizConfig.DAILY_QUIZ_LENGTH} Fragen aus allen Kategorien`}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={done ? colors.textMuted : "rgba(255, 255, 255, 0.8)"} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: `${colors.primary}80`,
  },
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
  /** Finished for today: neutral surface instead of the loud accent fill. */
  cardDone: { borderColor: colors.border },
  // Done sits on the neutral surface, which is white in the light theme – the
  // white lettering of the blue state would vanish on it.
  iconDone: { backgroundColor: colors.surfacePressed, borderColor: colors.border },
  iconImage: { width: '100%', height: '100%' },
  // Dimmed on the grey card so the symbol does not outshine everything around it.
  iconImageDone: { opacity: 0.7 },
  titleDone: { color: colors.textSecondary },
  subtitleDone: { color: colors.textMuted },
  badgeDone: { backgroundColor: colors.surfacePressed, borderWidth: 1, borderColor: colors.border },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    flexShrink: 0,
  },
  texts: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 17, lineHeight: 21, fontWeight: '800', letterSpacing: -0.2, color: colors.white },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, color: colors.primaryStrong },
  badgeTextDone: { color: colors.textMuted },
  subtitle: { fontSize: 11, letterSpacing: 0.2, color: 'rgba(255, 255, 255, 0.85)' },
}));
