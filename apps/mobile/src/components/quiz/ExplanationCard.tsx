import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { Card, Text } from '../ui';

interface ExplanationCardProps {
  isCorrect: boolean;
  explanation: string;
  xpEarned: number;
}

export function ExplanationCard({ isCorrect, explanation, xpEarned }: ExplanationCardProps) {
  return (
    <Card elevated style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={20} color={isCorrect ? colors.success : colors.danger} />
        <Text variant="bodyStrong" color={isCorrect ? 'success' : 'danger'} style={styles.title}>
          {isCorrect ? 'Richtig' : 'Leider falsch'}
        </Text>
        <Text variant="label" color="accent" accessibilityLabel={`${xpEarned} XP erhalten`}>
          +{xpEarned} XP
        </Text>
      </View>
      <Text color="secondary">{explanation}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.xl, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
});
