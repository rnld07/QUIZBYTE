import { Pressable, View } from 'react-native';

import { toggleDifficulty } from '@quizbyte/shared';
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
 * Schwierigkeit: "Alle" und die drei Stufen, beliebig kombinierbar.
 *
 * "Alle" ist der Ausgangszustand und leuchtet dann allein – die drei Stufen
 * stehen dunkel daneben, weil keine davon einzeln gewählt ist. Tippt man sie
 * einzeln an, leuchten sie einzeln, auch wenn am Ende alle drei markiert sind.
 * Für den Filter ist beides dasselbe; für die Anzeige ist es das, was man
 * angetippt hat.
 */
export function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  const styles = useStyles();
  // Nicht `isAllDifficulties`: das gilt auch für drei einzeln gewählte Stufen.
  const all = value.length === 0;

  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel="Schwierigkeit">
      <Segment label="Alle" active={all} onPress={() => onChange([])} />
      {LEVELS.map((level) => (
        <Segment
          key={level}
          label={DIFFICULTY_LABELS[level]}
          active={value.includes(level)}
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
