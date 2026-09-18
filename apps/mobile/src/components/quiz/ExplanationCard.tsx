import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Text } from '../ui';

interface ExplanationCardProps {
  isCorrect: boolean;
  explanation: string;
  xpEarned: number;
}

export function ExplanationCard({ isCorrect, explanation, xpEarned }: ExplanationCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const borderColor = isCorrect ? colors.success : colors.danger;
  const bgColor = isCorrect ? colors.successSoft : colors.dangerSoft;

  return (
    <View style={[styles.card, { borderColor, backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Ionicons
          name={isCorrect ? 'checkmark-circle' : 'close-circle'}
          size={22}
          color={isCorrect ? colors.success : colors.danger}
        />
        <Text variant="bodyStrong" color={isCorrect ? 'success' : 'danger'} style={styles.title}>
          {isCorrect ? 'Richtig!' : 'Leider falsch'}
        </Text>
        {xpEarned > 0 ? (
          <View style={styles.xpBadge}>
            <Text variant="label" style={styles.xpText} accessibilityLabel={`${xpEarned} XP erhalten`}>
              +{xpEarned} XP
            </Text>
          </View>
        ) : null}
      </View>
      {explanation ? (
        <Text color="secondary" style={styles.explanation}>
          {explanation}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  card: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  xpBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  xpText: { color: colors.primary, fontSize: 12 },
  explanation: { fontSize: 15, lineHeight: 22 },
}));
