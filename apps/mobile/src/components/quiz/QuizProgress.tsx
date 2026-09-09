import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { ProgressBar, Text } from '../ui';

interface QuizProgressProps {
  current: number;
  total: number;
}

export function QuizProgress({ current, total }: QuizProgressProps) {
  const percent = total > 0 ? (current / total) * 100 : 0;
  return (
    <View style={styles.container}>
      <Text variant="caption" color="secondary" accessibilityLabel={`Frage ${current} von ${total}`}>
        {current} / {total}
      </Text>
      <ProgressBar value={percent} height={4} style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.xl },
  bar: { width: '100%' },
});
