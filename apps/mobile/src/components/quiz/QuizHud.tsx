import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { quizModeById } from '@quizbyte/shared';
import type { QuizMode } from '@quizbyte/shared';

import { formatClock } from '@/features/quiz/useRoundClock';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Text } from '../ui';

/** Under ten seconds the clock turns red – that is the part worth noticing. */
const URGENT_MS = 10_000;

interface QuizHudProps {
  mode: QuizMode;
  /** Lives left, or null in a mode that has none. */
  livesLeft: number | null;
  /** Milliseconds left, or null in an untimed mode. */
  remainingMs: number | null;
  /** Right answers so far in this round. */
  correct: number;
  /** How many questions have been answered, for the spoken label. */
  answered: number;
}

/**
 * What the round stands at, beside the category above the question.
 *
 * Up here rather than tucked into the line above the progress bar: the clock,
 * the lives and the score are what a player glances at between answers, and a
 * glance does not travel to the top of the screen and back. Big enough to be
 * read without looking away from the question.
 */
export function QuizHud({ mode, livesLeft, remainingMs, correct, answered }: QuizHudProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const rules = quizModeById(mode);
  const urgent = remainingMs !== null && remainingMs <= URGENT_MS;

  return (
    <View style={styles.row}>
      {remainingMs !== null ? (
        <View style={[styles.clock, urgent && { borderColor: colors.danger, backgroundColor: `${colors.danger}1F` }]}>
          <Text
            style={[styles.clockText, { color: urgent ? colors.danger : colors.warning }]}
            accessibilityLabel={`Noch ${Math.ceil(remainingMs / 1000)} Sekunden`}
          >
            {formatClock(remainingMs)}
          </Text>
        </View>
      ) : null}

      {livesLeft !== null ? <LifeHearts total={rules.lives ?? 0} left={livesLeft} /> : null}

      {/* The score: the figure alone in a ring. A tick beside it said what kind
          of number it was, and then there were two things to read instead of
          one. */}
      <View style={[styles.score, { borderColor: `${colors.success}66` }]}>
        <Text style={[styles.scoreText, { color: colors.success }]} accessibilityLabel={`${correct} von ${answered} richtig`}>
          {correct}
        </Text>
      </View>
    </View>
  );
}

/**
 * One heart per life the mode grants.
 *
 * Spent hearts stay as outlines rather than disappearing, so the row keeps its
 * width and you can still see how many you started with.
 */
function LifeHearts({ total, left }: { total: number; left: number }) {
  const styles = useStyles();
  // The heart that was just spent – it is still drawn while it pops and fades.
  const [losing, setLosing] = useState<number | null>(null);
  const previous = useRef(left);

  useEffect(() => {
    if (left < previous.current) setLosing(left);
    previous.current = left;
  }, [left]);

  return (
    <View style={styles.lives} accessibilityLabel={left === 1 ? 'Noch 1 Leben' : `Noch ${left} Leben`}>
      {Array.from({ length: total }, (_, index) => (
        <Life key={index} filled={index < left} losing={index === losing} onLost={() => setLosing(null)} />
      ))}
    </View>
  );
}

/** A heart that bursts once when it is spent, then stays as an outline. */
function Life({ filled, losing, onLost }: { filled: boolean; losing: boolean; onLost: () => void }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!losing) return;
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) onLost();
      },
    );
    // `onLost` is a fresh closure on every render; re-running on it would
    // restart the burst forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [losing, pop]);

  return (
    <View style={styles.life}>
      <Ionicons name="heart-outline" size={HEART} color={colors.textMuted} />
      {filled ? (
        <View style={styles.lifeOverlay}>
          <Ionicons name="heart" size={HEART} color={colors.danger} />
        </View>
      ) : null}
      {losing ? (
        <Animated.View
          style={[
            styles.lifeOverlay,
            {
              opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
            },
          ]}
        >
          <Ionicons name="heart" size={HEART} color={colors.danger} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Big enough to count at a glance without looking away from the question. */
const HEART = 22;

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  clock: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.warning}66`,
    backgroundColor: colors.warningSoft,
  },
  // Tabular-looking: a fixed width so the box does not twitch as the seconds
  // tick from 1:00 down to 0:09.
  clockText: { fontSize: 19, fontWeight: '800', lineHeight: 23, minWidth: 52, textAlign: 'center' },

  lives: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  // The filled heart sits exactly on the outline, so the burst can grow past
  // the row without pushing the other hearts sideways.
  life: { width: HEART, height: HEART },
  lifeOverlay: { position: 'absolute', top: 0, left: 0 },

  score: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  scoreText: { fontSize: 19, fontWeight: '900', lineHeight: 23 },
}));
