import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet, Text } from '@/components/ui';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

/** `null` heißt "seit Beginn". */
export type Period = number | null;

interface PeriodOption {
  days: Period;
  label: string;
  hint: string;
}

export const PERIODS: readonly PeriodOption[] = [
  { days: null, label: 'Gesamt', hint: 'seit deinem ersten Quiz' },
  { days: 7, label: '7 Tage', hint: 'diese Woche' },
  { days: 30, label: '30 Tage', hint: 'dieser Monat' },
  { days: 182, label: '6 Monate', hint: 'das halbe Jahr' },
  { days: 365, label: '1 Jahr', hint: 'die letzten zwölf Monate' },
];

export function periodLabel(days: Period): string {
  return PERIODS.find((entry) => entry.days === days)?.label ?? 'Gesamt';
}

/**
 * Der Knopf, der den Zeitraum wählt – mit demselben Fenster von unten wie die
 * Quotenlinie darüber.
 *
 * Als eigene Komponente, weil er inzwischen an zwei Stellen steht: eine zweite
 * Fassung derselben fünf Zeilen wäre die, die beim nächsten Zeitraum vergessen
 * wird.
 */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: Period;
  onChange: (days: Period) => void;
}) {
  const styles = useStyles();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Zeitraum: ${periodLabel(value)}. Ändern`}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text variant="label" style={styles.buttonText}>
          {periodLabel(value)}
        </Text>
        <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        title="Zeitraum"
        eyebrow={periodLabel(value).toUpperCase()}
        height={0.5}
        onClose={() => setOpen(false)}
      >
        {PERIODS.map((entry) => (
          <Pressable
            key={entry.label}
            onPress={() => {
              onChange(entry.days);
              setOpen(false);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: entry.days === value }}
            accessibilityLabel={entry.label}
            style={({ pressed }) => [
              styles.option,
              entry.days === value && styles.optionActive,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, entry.days === value && styles.optionLabelActive]}>
                {entry.label}
              </Text>
              <Text variant="label" color="muted">
                {entry.hint}
              </Text>
            </View>
            {entry.days === value ? (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </BottomSheet>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfacePressed,
  },
  buttonText: { fontSize: 12, color: colors.textSecondary },
  pressed: { opacity: 0.7 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { flex: 1, gap: 1 },
  optionLabel: { fontSize: 15, color: colors.textSecondary },
  optionLabelActive: { color: colors.textPrimary, fontWeight: '700' },
}));
