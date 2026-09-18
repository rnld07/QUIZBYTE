import { View } from 'react-native';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { ProgressBar, Text } from '../ui';

interface QuizProgressProps {
  current: number;
  total: number;
  /**
   * Fills the bar with something other than the question count – a timed round
   * measures itself in seconds, where the number of questions says nothing.
   */
  percent?: number;
  color?: string;
  /** Read out instead of "Frage x von y" when the bar means something else. */
  label?: string;
  /**
   * The round has no target to fill towards – it ends on its own rule.
   *
   * Then a bar would be a lie: it would creep towards a sixtieth question that
   * is a technical ceiling, not a finish line. The count alone is the honest
   * thing to show.
   */
  openEnded?: boolean;
}

/**
 * How far the round has come – measured in questions left behind, not in the
 * one on screen. The first question therefore starts at zero and the last one
 * stops short of the end: the bar fills up as you work, and running it out
 * before the final answer is given would promise a finish that is not there yet.
 */
export function QuizProgress({ current, total, percent, color, label, openEnded }: QuizProgressProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const done = Math.max(0, current - 1);
  const value = percent ?? (total > 0 ? (done / total) * 100 : 0);

  // An open round with no clock has nothing to fill: just say which question
  // this is. A timed one still gets its bar, because the clock is the target.
  if (openEnded && percent === undefined) {
    return (
      <View style={styles.container} accessibilityLabel={label ?? `Frage ${current}`}>
        <Text variant="label" color="secondary" align="center">
          FRAGE {current}
        </Text>
      </View>
    );
  }

  // The figure belongs to the bar only where the bar counts questions. In a
  // timed round it counts seconds, and "2/5" beside it would be answering a
  // question nobody asked.
  const showCount = percent === undefined && !openEnded && total > 0;

  return (
    <View
      style={styles.container}
      accessibilityLabel={label ?? `Frage ${current} von ${total}`}
      accessibilityRole="progressbar"
    >
      <View style={styles.row}>
        <ProgressBar
          value={Math.max(0, Math.min(100, value))}
          height={5}
          color={color ?? colors.primary}
          trackColor={colors.surface}
          style={styles.bar}
        />
        {showCount ? (
          <Text variant="label" color="secondary" style={styles.count}>
            {current}/{total}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: {
    flex: 1,
    borderRadius: radius.full,
  },
  count: { fontSize: 11, flexShrink: 0 },
}));
