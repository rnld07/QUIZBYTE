import { Pressable, View } from 'react-native';

import { isAllDifficulties, toggleDifficulty } from '@quizbyte/shared';
import type { Difficulty } from '@quizbyte/shared';

import { makeStyles, radius, spacing } from '@/theme';

import { Text } from '../ui';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
};

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

interface DifficultyPickerProps {
  /** Empty means every level. */
  value: readonly Difficulty[];
  onChange: (value: Difficulty[]) => void;
}

/**
 * Difficulty selection: "Alle" plus the three levels, which can be combined.
 *
 * Picking every level is the same thing as "Alle", so the control snaps back to
 * it instead of showing three highlighted buttons and an unhighlighted "Alle"
 * that mean exactly the same.
 */
export function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  const styles = useStyles();
  const all = isAllDifficulties(value);

  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel="Schwierigkeit">
      <Segment label="Alle" active={all} onPress={() => onChange([])} />
      {LEVELS.map((level) => (
        <Segment
          key={level}
          label={DIFFICULTY_LABELS[level]}
          active={!all && value.includes(level)}
          onPress={() => onChange(toggleDifficulty(value, level))}
        />
      ))}
    </View>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.segment, active && styles.segmentActive, pressed && styles.segmentPressed]}
    >
      <Text variant="label" numberOfLines={1} style={[styles.text, active && styles.textActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfacePressed,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentPressed: { opacity: 0.7 },
  text: { fontSize: 12, color: colors.textSecondary },
  textActive: { color: colors.white, fontWeight: '700' },
}));
