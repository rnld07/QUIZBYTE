import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import type { LevelProgress } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useGradients } from '@/theme';

import { Text } from '../ui';

interface LevelPillProps {
  level: LevelProgress | null;
  /** Width of the XP bar next to the label. */
  barWidth?: number;
}

/** The colours a level-up borrows for its two seconds. */
const GOLD = '#F1B434';
const GOLD_RAMP = ['#FFE79B', '#F1B434', '#C8901A'] as const;

/**
 * Compact "Level N + XP bar" readout.
 *
 * A level-up is the one thing in the app that is worth interrupting for, so it
 * gets more than a colour change: the pill swells to half again its size, turns
 * gold, and says so underneath itself. Below, not above – above is where the
 * wordmark sits. The banner is positioned absolutely either way: a celebration
 * that pushes the page down moves whatever the player was about to tap.
 */
export function LevelPill({ level, barWidth = 76 }: LevelPillProps) {
  const styles = useStyles();
  const gradients = useGradients();
  const [pulse] = useState(() => new Animated.Value(0));
  const previousLevel = useRef<number | null>(null);
  const [levelledUp, setLevelledUp] = useState(false);

  useEffect(() => {
    if (!level) return;
    const before = previousLevel.current;
    previousLevel.current = level.level;
    // Only a real increase counts – not the first render.
    if (before === null || level.level <= before) return;

    setLevelledUp(true);
    Animated.sequence([
      // Out with a bounce, hold, then shrink back without drawing attention.
      Animated.timing(pulse, { toValue: 1, duration: 340, easing: Easing.out(Easing.back(2.6)), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, delay: 1500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setLevelledUp(false);
    });
  }, [level, pulse]);

  if (!level) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  // The banner arrives a touch after the pill starts growing and leaves with it.
  const bannerOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const bannerLift = pulse.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });

  return (
    <View style={styles.stage}>
      {levelledUp ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.banner, { opacity: bannerOpacity, transform: [{ translateY: bannerLift }] }]}
        >
          <Text style={styles.bannerText}>LVL UP!</Text>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.row, { transform: [{ scale }] }]} accessibilityLabel={`Level ${level.level}`}>
        <Text variant="label" numberOfLines={1} style={[styles.label, levelledUp && styles.labelUp]}>
          Level {level.level}
        </Text>
        <View style={[styles.track, { width: barWidth }]}>
          <LinearGradient
            colors={levelledUp ? [...GOLD_RAMP] : gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${Math.min(100, Math.max(0, level.progressPercent))}%` }]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  // Trägt das Band, das unten herausragt – deshalb selbst schon erhöht.
  stage: { alignItems: 'center', zIndex: 5, elevation: 5 },
  // Under the pill and out of the layout: it lasts two seconds and must not
  // move anything that was already on screen – and above it is the wordmark.
  banner: {
    position: 'absolute',
    top: '100%',
    marginTop: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: `${GOLD}26`,
    borderWidth: 1,
    borderColor: GOLD,
    zIndex: 5,
    elevation: 5,
  },
  bannerText: { fontSize: 11, lineHeight: 14, fontWeight: '900', letterSpacing: 1, color: GOLD },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.textSecondary,
  },
  labelUp: { color: GOLD },
  track: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.full },
}));
