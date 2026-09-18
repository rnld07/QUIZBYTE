import { View } from 'react-native';

import { computeAccuracy } from '@quizbyte/shared';
import type { Difficulty } from '@quizbyte/shared';

import type { DifficultyStat } from '@/services/api/progressApi';
import { makeStyles, spacing, useThemeColors } from '@/theme';
import type { ThemeColors } from '@/theme';

import { ProgressBar, Skeleton, Text } from '../ui';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
};

const DIFFICULTY_COLOR_KEYS: Record<Difficulty, keyof ThemeColors> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

/** Traffic-light colour per difficulty, for the active theme. */
export function useDifficultyColors(): Record<Difficulty, string> {
  const colors = useThemeColors();
  return { easy: colors[DIFFICULTY_COLOR_KEYS.easy], medium: colors[DIFFICULTY_COLOR_KEYS.medium], hard: colors[DIFFICULTY_COLOR_KEYS.hard] };
}

const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

interface DifficultyBreakdownProps {
  stats: DifficultyStat[];
  loading?: boolean;
  /** Slimmer rows for the category sheet. */
  compact?: boolean;
}

/** Accuracy per difficulty level – shared by the analysis and category sheets. */
export function DifficultyBreakdown({ stats, loading, compact }: DifficultyBreakdownProps) {
  const styles = useStyles();
  const difficultyColors = useDifficultyColors();
  const colors = useThemeColors();
  if (loading) {
    return (
      <View style={styles.skeletons}>
        <Skeleton height={compact ? 26 : 34} borderRadius={8} />
        <Skeleton height={compact ? 26 : 34} borderRadius={8} />
        <Skeleton height={compact ? 26 : 34} borderRadius={8} />
      </View>
    );
  }

  return (
    <>
      {ORDER.map((key) => {
        const stat = stats.find((entry) => entry.difficulty === key);
        const attempts = stat?.attempts ?? 0;
        const correct = stat?.correct ?? 0;
        const value = computeAccuracy(correct, attempts);
        return (
          <View key={key} style={styles.row} accessibilityLabel={`${DIFFICULTY_LABELS[key]}: ${correct} von ${attempts} Fragen richtig, ${value} Prozent`}>
            <View style={styles.head}>
              <View style={styles.name}>
                <View style={[styles.dot, { backgroundColor: difficultyColors[key] }]} />
                <Text variant="caption" color="secondary">
                  {DIFFICULTY_LABELS[key]}
                </Text>
              </View>
              {/* The ratio, not the count: how many there were says nothing
                  without how many went right. */}
              <Text variant="caption" color="muted">
                {attempts > 0 ? `${correct}/${attempts}` : '–'}
              </Text>
              <Text variant="caption" style={[styles.value, attempts === 0 && styles.valueMuted]}>
                {attempts > 0 ? `${value} %` : '–'}
              </Text>
            </View>
            <ProgressBar
              value={value}
              height={compact ? 5 : 6}
              // One blue bar everywhere – only the dot carries the level colour.
              color={attempts > 0 ? colors.primary : colors.textMuted}
              trackColor={colors.surfacePressed}
            />
          </View>
        );
      })}
    </>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  skeletons: { gap: spacing.sm },
  row: { gap: spacing.xs, paddingVertical: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 999 },
  value: { color: colors.textPrimary, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  valueMuted: { color: colors.textMuted },
}));
