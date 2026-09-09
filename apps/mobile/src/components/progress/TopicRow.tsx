import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { ProgressBar, Text } from '../ui';

interface TopicRowProps {
  label: string;
  accuracy: number;
  attempts: number;
}

function barColor(accuracy: number): string {
  if (accuracy >= 80) return colors.success;
  if (accuracy < 60) return colors.danger;
  return colors.primary;
}

export function TopicRow({ label, accuracy, attempts }: TopicRowProps) {
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${accuracy} Prozent bei ${attempts} Fragen`}>
      <View style={styles.header}>
        <Text variant="body" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text variant="bodyStrong">{accuracy} %</Text>
      </View>
      <ProgressBar value={accuracy} height={5} color={barColor(accuracy)} />
      <Text variant="caption" color="muted">
        {attempts} {attempts === 1 ? 'Frage' : 'Fragen'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingVertical: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  label: { flex: 1 },
});
