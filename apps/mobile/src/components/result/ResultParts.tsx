import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import type { LevelProgress } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Card, ProgressBar, Text } from '../ui';

interface ResultHeroProps {
  /** Small line above, e.g. "FACHINFORMATIK · BLITZ". */
  eyebrow: string;
  /** The one number the round is about. */
  headline: string;
  /** Colours the headline – each mode has its own reason to stand out. */
  headlineColor?: string;
  /** What that number means. */
  caption: string;
  /** Colours the caption, e.g. the accuracy band. */
  captionColor?: string;
}

/** How long the XP figure and the green piece of the level bar take to fill. */
const COUNT_MS = 900;

/** How long the blue then takes to run after the green and take it over. */
const SETTLE_MS = 600;

/**
 * Counts from zero up to `target`, easing out at the end.
 *
 * Driven by frames rather than `Animated`: the value has to be readable as a
 * number to be written into the text, and a listener on an Animated.Value would
 * set state just as often for the same result.
 */
function useCountUp(target: number, duration = COUNT_MS): number {
  const [value, setValue] = useState(target > 0 ? 0 : target);

  useEffect(() => {
    if (target <= 0) return;
    const started = Date.now();
    let frame = requestAnimationFrame(function tick() {
      const t = Math.min(1, (Date.now() - started) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/**
 * The top of every result page: one number and what it means.
 *
 * The XP is deliberately not repeated here – it is counted out on the level
 * row below, where it can be seen arriving on the bar.
 */
export function ResultHero({ eyebrow, headline, headlineColor, caption, captionColor }: ResultHeroProps) {
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <Text variant="label" color="secondary" numberOfLines={1}>
        {eyebrow}
      </Text>
      <Text variant="display" style={[styles.headline, headlineColor ? { color: headlineColor } : null]}>
        {headline}
      </Text>
      <Text
        variant="headline"
        color={captionColor ? undefined : 'secondary'}
        align="center"
        style={captionColor ? { color: captionColor } : null}
      >
        {caption}
      </Text>
    </View>
  );
}

/**
 * Where the level stands after the round, in one line.
 *
 * The level is context, not the result – it had a whole card with a heading and
 * two lines of text, which took more room than the round it was reporting on.
 * Now: the level in a pill, the bar beside it, this round's XP at the end.
 */
export function LevelCard({
  level,
  levelBefore,
  leveledUp,
  xp,
}: {
  level: LevelProgress;
  levelBefore: LevelProgress;
  leveledUp: boolean;
  /** XP earned in this round – the figure at the end of the row. */
  xp: number;
}) {
  const styles = useStyles();
  const colors = useThemeColors();
  // Counts in step with the green piece of the bar, so the figure and the
  // length that is growing say the same thing at the same moment.
  const shownXp = useCountUp(xp);
  // The bar says when: the level only goes up once it has run to the end.
  const [arrived, setArrived] = useState(!leveledUp);
  // Stable, so the bar's animation is not restarted by a re-render of this row.
  const handleArrived = useCallback(() => setArrived(true), []);

  return (
    <Card
      style={[styles.levelRow, leveledUp && { borderColor: colors.primary }]}
      padding="md"
      accessibilityLabel={
        `Level ${level.level}, ${level.xpIntoLevel} von ${level.xpForLevel} XP, ` +
        `${xp} XP in dieser Runde${leveledUp ? ', Level-Up' : ''}`
      }
    >
      <LevelBadge level={arrived ? level.level : levelBefore.level} leveledUp={leveledUp} celebrate={leveledUp && arrived} />

      <LevelBar before={levelBefore} after={level} leveledUp={leveledUp} onArrived={handleArrived} />

      {/* What this round brought in, not how far the next level still is –
          green like the piece of the bar it belongs to. The level-up itself is
          announced by the pill and the card's border. */}
      <Text variant="label" style={[styles.levelTail, { color: colors.success }]} numberOfLines={1}>
        +{shownXp} XP
      </Text>
    </Card>
  );
}

/**
 * The "Lv 7" pill, which pops when the level goes up.
 *
 * The celebration waits for the bar: the pill counts up at the moment the bar
 * runs off the end, so the two read as one event – the bar fills, the level
 * turns over. A ring pushes out from behind it and fades, which is what makes
 * it look like something happened rather than a number quietly changing.
 */
function LevelBadge({ level, leveledUp, celebrate }: { level: number; leveledUp: boolean; celebrate: boolean }) {
  const styles = useStyles();
  const colors = useThemeColors();

  const [pop] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!celebrate) return;
    const animation = Animated.parallel([
      // Out and back: a spring on the way back gives it the small wobble that
      // reads as a pop rather than a resize.
      Animated.sequence([
        Animated.timing(pop, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(pop, { toValue: 0, friction: 4, tension: 90, useNativeDriver: true }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [celebrate, pop, ring]);

  return (
    <View>
      {/* Behind the pill and ignored by touches – it is decoration, and it
          grows past the pill's own edge. */}
      {!celebrate ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.levelRing,
            {
              borderColor: colors.primary,
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.levelPill,
          leveledUp && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
          { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }] },
        ]}
      >
        <Text variant="label" style={[styles.levelPillText, leveledUp && { color: colors.primary }]}>
          Lv {level}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Where the level stood, and what this round added.
 *
 * Two movements, one after the other. First the green piece charges up out of
 * the blue for the XP just earned. Only when it has arrived does the blue run
 * after it and take it over, so the new XP is seen being earned and then being
 * added to the standing total – rather than the bar simply changing colour.
 *
 * A level-up fills the bar to the end and then starts the next level, which is
 * what a level-up looks like.
 */
function LevelBar({
  before,
  after,
  leveledUp,
  onArrived,
}: {
  before: LevelProgress;
  after: LevelProgress;
  leveledUp: boolean;
  /** Fires once the bar has finished – the moment the level turns over. */
  onArrived: () => void;
}) {
  const styles = useStyles();
  const colors = useThemeColors();

  const from = leveledUp ? before.progressPercent : Math.min(before.progressPercent, after.progressPercent);
  const to = leveledUp ? 100 : after.progressPercent;
  const gained = Math.max(0, to - from);

  const [grow] = useState(() => new Animated.Value(0));
  const [fill] = useState(() => new Animated.Value(from));
  // Nothing to grow: the round paid no XP, so the bar is simply where it stands.
  const [done, setDone] = useState(gained <= 0);

  useEffect(() => {
    if (gained <= 0) {
      onArrived();
      return;
    }
    const animation = Animated.sequence([
      Animated.timing(grow, {
        toValue: 1,
        duration: COUNT_MS,
        easing: Easing.out(Easing.cubic),
        // A width cannot run on the native driver; it is one small view for
        // under a second, on a screen with nothing else moving.
        useNativeDriver: false,
        isInteraction: false,
      }),
      Animated.timing(fill, {
        toValue: to,
        duration: SETTLE_MS,
        // Eases in and out: the blue sets off after the green has stopped, so
        // it should start moving rather than appear to be already moving.
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
        isInteraction: false,
      }),
    ]);
    animation.start(({ finished }) => {
      if (!finished) return;
      setDone(true);
      onArrived();
    });
    return () => animation.stop();
  }, [fill, gained, grow, onArrived, to]);

  return (
    <View style={[styles.levelTrack, { backgroundColor: colors.border }]}>
      {done ? null : (
        <Animated.View
          style={[
            styles.levelFill,
            {
              left: `${from}%`,
              width: grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${gained}%`] }),
              backgroundColor: colors.success,
            },
          ]}
        />
      )}

      {/* Drawn last, so the blue running after the green covers it instead of
          stopping beside it. */}
      <Animated.View
        style={[
          styles.levelFill,
          {
            width: done
              ? (`${after.progressPercent}%` as const)
              : fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            backgroundColor: colors.primary,
          },
        ]}
      />
    </View>
  );
}

interface RecordCardProps {
  /** What is being counted, e.g. "richtige Antworten". */
  unit: string;
  /** What this round reached. */
  value: number;
  /** The best before this round – the bar runs up to it. */
  best: number;
  /** Shown instead of the comparison when there is no earlier round. */
  firstRoundHint: string;
  hasHistory: boolean;
}

/**
 * The personal best for a mode, with a bar that runs up to it and is filled as
 * far as this round got.
 *
 * The comparison deliberately excludes the round just played – otherwise the
 * best would always equal the current score and the bar would always be full.
 */
export function RecordCard({ unit, value, best, firstRoundHint, hasHistory }: RecordCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const isRecord = hasHistory && value > best;
  const top = Math.max(best, value);
  // The scale is the record – or this round, once it has passed it.
  const scale = Math.max(top, 1);

  return (
    <Card elevated style={[styles.card, isRecord && { borderColor: colors.warning }]}>
      <View style={styles.cardRow}>
        <View style={styles.recordLabel}>
          {/* Trophy and figure stay gold – that is what a highscore looks like,
              whether or not it was set just now. */}
          <Ionicons name="trophy" size={16} color={colors.warning} />
          <Text variant="bodyStrong">Highscore</Text>
        </View>
        <Text variant="bodyStrong" style={{ color: colors.warning }}>
          {top}
        </Text>
      </View>

      {/* Green for what the round scored: the bar reads as progress, not as a
          warning, and the gold belongs to the record it is heading for. */}
      <ProgressBar
        value={(value / scale) * 100}
        height={8}
        color={colors.success}
        accessibilityLabel={`Diese Runde ${value} von ${top} ${unit}`}
      />

      <View style={styles.cardRow}>
        <Text variant="caption" color="secondary">
          Diese Runde: {value} {unit}
        </Text>
        {!hasHistory ? null : isRecord ? (
          <Text variant="label" style={{ color: colors.warning }}>
            Neuer Rekord
          </Text>
        ) : (
          <Text variant="caption" color="muted">
            {best === value ? 'Rekord eingestellt' : `noch ${best - value}`}
          </Text>
        )}
      </View>

      {!hasHistory ? (
        <Text variant="caption" color="secondary">
          {firstRoundHint}
        </Text>
      ) : null}
    </Card>
  );
}

export interface StatItem {
  label: string;
  value: string;
  /** Optional tint for the figure, e.g. the accuracy band. */
  color?: string;
}

/** A row of small figures under the hero – three at most, or they stop counting. */
export function StatRow({ items }: { items: StatItem[] }) {
  const styles = useStyles();
  return (
    <Card style={styles.statRow}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.stat, index > 0 && styles.statDivided]}>
          <Text variant="bodyStrong" style={[styles.statValue, item.color ? { color: item.color } : null]}>
            {item.value}
          </Text>
          <Text variant="label" color="muted" numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
  headline: { marginTop: spacing.sm, textAlign: 'center' },

  card: { gap: spacing.sm, marginBottom: spacing.lg },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  levelPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surfacePressed,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelPillText: { fontSize: 11, color: colors.textSecondary },
  // Covers the pill exactly, then grows out past it – so it has to be laid out
  // by the pill rather than given a size of its own.
  levelRing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.full, borderWidth: 2 },
  levelTrack: { flex: 1, height: 6, borderRadius: radius.full, overflow: 'hidden' },
  levelFill: { position: 'absolute', top: 0, bottom: 0 },
  // Fixed width so the bar beside it does not get shorter as the figure counts
  // up from "+0 XP" to "+120 XP".
  levelTail: { fontSize: 11, minWidth: 62, textAlign: 'right', color: colors.textMuted },

  statRow: { flexDirection: 'row', marginBottom: spacing.lg, paddingVertical: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statDivided: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontSize: 19, lineHeight: 23, color: colors.textPrimary },
}));
