import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { DayHistory } from '@/services/api/historyApi';
import { FixedTheme, makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { IconButton, Skeleton, Text } from '../ui';

/** Which figure of a day the chart is drawing. */
export type HistoryMetric =
  | 'answered'
  | 'correct'
  | 'wrong'
  | 'sessions'
  | 'perfect'
  | 'duels'
  | 'duelsWon'
  | 'duelsDrawn'
  | 'duelsLost';

/**
 * One part of a stacked bar.
 *
 * For a figure whose parts are worth more than its total: three duels on a day
 * says less than two won and one lost.
 */
export interface HistoryPart {
  metric: HistoryMetric;
  color: string;
  label: string;
}

/**
 * How a figure is drawn.
 *
 * `bars` is the usual one. `dots` is for the streak, where the only question
 * about a day is whether it happened at all – a bar of height one next to a bar
 * of height twelve would say something about quantity that a streak does not
 * care about.
 */
export type HistoryShape = 'bars' | 'dots';

interface HistoryDialogProps {
  visible: boolean;
  title: string;
  /** The figure as it stands today, shown above the chart. */
  value: string;
  metric: HistoryMetric;
  shape?: HistoryShape;
  /**
   * The day's whole, drawn in grey behind the bar.
   *
   * "Sieben richtig" means something different on a day with eight questions
   * than on one with thirty, and the grey column is what says which.
   */
  against?: HistoryMetric;
  /**
   * Splits each bar into parts instead of drawing it in one colour.
   *
   * The parts have to add up to `metric` – they are drawn as shares of the
   * day's own bar, and a part that belongs to no total would make the chart
   * lie about the scale.
   */
  parts?: readonly HistoryPart[];
  days: readonly DayHistory[];
  loading: boolean;
  /** Colours the bars – the same tone the tile carries. */
  tone: string;
  onClose: () => void;
}

/** Height of the tallest bar. Everything else is a share of it. */
const CHART_HEIGHT = 120;

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/**
 * One figure over the last seven days.
 *
 * The same window for every tile: what changes is the column it reads and the
 * colour it draws in. Six dialogs that differed only in their numbers would be
 * six places to fix the next time a chart needs a label.
 *
 * Bars rather than a line – the values are counts of things that happened on a
 * day, and a line between them would draw a Tuesday that never existed.
 */
function HistoryDialogBody({
  visible,
  title,
  value,
  metric,
  shape = 'bars',
  against,
  parts,
  days,
  loading,
  tone,
  onClose,
}: HistoryDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();

  if (!visible) return null;

  const values = days.map((day) => day[metric]);
  const total = values.reduce((sum, entry) => sum + entry, 0);
  // The tallest thing on the chart sets the scale – with a backdrop column that
  // is the whole, not the part of it that is coloured in.
  const peak = Math.max(1, ...days.map((day) => (against ? day[against] : day[metric])));

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.fillClip}>
            <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={gradients.edge} style={styles.edge} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text variant="label" style={styles.eyebrow}>
                LETZTE 7 TAGE
              </Text>
              <Text variant="headline" style={styles.title}>
                {title}
              </Text>
            </View>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={onClose} />
          </View>

          <View style={styles.body}>
            <Text style={[styles.value, { color: tone }]}>{value}</Text>
            <Text variant="caption" color="muted">
              insgesamt
            </Text>

            {loading ? (
              <Skeleton height={shape === 'dots' ? 56 : CHART_HEIGHT} borderRadius={radius.lg} style={styles.chartSkeleton} />
            ) : (
              <View style={[styles.chart, shape === 'dots' && styles.chartDots]}>
                {days.map((day) => {
                  const amount = day[metric];
                  // Without a backdrop the column is the bar itself. Reading
                  // the whole as zero collapsed the chart to a couple of
                  // pixels – which is why the duels and the finished quizzes
                  // opened a window with nothing in it.
                  const whole = against ? day[against] : amount;
                  const date = new Date(`${day.day}T00:00:00`);
                  const weekday = WEEKDAYS[date.getDay()];

                  if (shape === 'dots') {
                    const active = amount > 0;
                    return (
                      <View
                        key={day.day}
                        style={styles.column}
                        accessibilityLabel={`${weekday}: ${active ? 'gespielt' : 'nicht gespielt'}`}
                      >
                        <View style={[styles.dot, { backgroundColor: active ? tone : colors.borderStrong }]} />
                        <Text variant="label" color="muted">
                          {weekday}
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <View
                      key={day.day}
                      style={styles.column}
                      accessibilityLabel={
                        against ? `${weekday}: ${amount} von ${whole}` : `${weekday}: ${amount}`
                      }
                    >
                      <Text variant="label" color="muted" style={styles.amount}>
                        {amount > 0 ? amount : ''}
                      </Text>

                      {/* The day's whole in grey, the part of it in colour,
                          sharing one baseline. A hairline stands in for an
                          empty day, so the row of days stays a row. */}
                      <View
                        style={[
                          styles.track,
                          against && styles.trackFilled,
                          { height: Math.max(2, (whole / peak) * CHART_HEIGHT) },
                        ]}
                      >
                        {parts && amount > 0 ? (
                          /* Stacked: each part is its share of the day, the
                             whole column its share of the week's best day.
                             Rounded at the top only, so the pieces read as one
                             bar rather than as three. */
                          <View style={[styles.bar, { height: Math.max(4, (amount / peak) * CHART_HEIGHT) }]}>
                            {parts.map((part, index) => {
                              const share = day[part.metric];
                              if (share <= 0) return null;
                              return (
                                <View
                                  key={part.metric}
                                  style={[
                                    styles.slice,
                                    {
                                      flex: share,
                                      backgroundColor: part.color,
                                      borderTopLeftRadius: index === 0 ? radius.sm : 0,
                                      borderTopRightRadius: index === 0 ? radius.sm : 0,
                                    },
                                  ]}
                                />
                              );
                            })}
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.bar,
                              {
                                height: amount > 0 ? Math.max(4, (amount / peak) * CHART_HEIGHT) : 2,
                                backgroundColor: amount > 0 ? tone : colors.border,
                              },
                            ]}
                          />
                        )}
                      </View>

                      <Text variant="label" color="muted">
                        {weekday}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Without this the three colours would be a guess. */}
            {parts && !loading ? (
              <View style={styles.legend}>
                {parts.map((part) => (
                  <View key={part.metric} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: part.color }]} />
                    <Text variant="label" color="secondary">
                      {part.label} {days.reduce((sum, day) => sum + day[part.metric], 0)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text variant="caption" color="secondary" align="center">
              {shape === 'dots'
                ? `${values.filter((entry) => entry > 0).length} von 7 Tagen gespielt`
                : total > 0
                  ? `${total} in dieser Woche`
                  : 'In dieser Woche noch nichts.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 13, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 380,
    paddingBottom: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  title: { letterSpacing: -0.2, color: colors.textPrimary },

  body: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xl },
  value: { fontSize: 34, fontWeight: '900', lineHeight: 38 },

  chartSkeleton: { alignSelf: 'stretch', marginTop: spacing.lg },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    // The same window whatever the numbers: a week of small figures used to
    // open a chart a few pixels tall, and the six tiles are meant to lead to
    // one place, not to six differently sized ones.
    minHeight: CHART_HEIGHT + 34,
  },
  /*
    The streak is the one chart that does not need the height: a row of dots
    says everything it has to say in the space of one line, and the fixed
    minimum left it standing in an empty window.
  */
  chartDots: { alignItems: 'center', justifyContent: 'center', minHeight: 0, marginTop: spacing.xl },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  amount: { fontSize: 10 },

  // The grey column is the day's whole; the coloured one sits inside it, both
  // standing on the same baseline.
  track: { alignSelf: 'stretch', justifyContent: 'flex-end', borderRadius: radius.sm },
  // Grey only where there is a whole to show behind the part.
  trackFilled: { backgroundColor: colors.surfacePressed },
  bar: { alignSelf: 'stretch', borderRadius: radius.sm, overflow: 'hidden' },
  // A part of a stacked bar – the rounding is set per part, see above.
  slice: { alignSelf: 'stretch' },

  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 999 },

  dot: { width: 14, height: 14, borderRadius: 999, marginBottom: 4 },
}));

/** Dark whatever the theme, like every dialog in the app. */
export function HistoryDialog(props: HistoryDialogProps) {
  return (
    <FixedTheme scheme="dark">
      <HistoryDialogBody {...props} />
    </FixedTheme>
  );
}
