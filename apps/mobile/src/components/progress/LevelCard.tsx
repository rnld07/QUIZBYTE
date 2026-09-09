import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { LevelProgress } from '@quizbyte/shared';

import { colors, spacing } from '@/theme';

import { Card, ProgressBar, Skeleton, Text } from '../ui';

interface LevelCardProps {
  level: LevelProgress | null;
  totalXp: number;
  streak: number;
  loading?: boolean;
}

export function LevelCard({ level, totalXp, streak, loading }: LevelCardProps) {
  if (loading || !level) {
    return (
      <Card elevated style={styles.card}>
        <Skeleton width={90} height={28} />
        <Skeleton height={6} />
        <Skeleton width={160} height={14} />
      </Card>
    );
  }

  return (
    <Card elevated style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text variant="label" color="secondary">
            LEVEL
          </Text>
          <Text variant="display">{level.level}</Text>
        </View>
        <View style={styles.streak} accessibilityLabel={`${streak} Tage Streak`}>
          <Ionicons name="flame" size={18} color={streak > 0 ? colors.warning : colors.textMuted} />
          <Text variant="bodyStrong" color={streak > 0 ? 'primary' : 'muted'}>
            {streak} {streak === 1 ? 'Tag' : 'Tage'}
          </Text>
        </View>
      </View>
      <ProgressBar value={level.progressPercent} height={8} />
      <View style={styles.bottom}>
        <Text variant="caption" color="secondary">
          {level.xpIntoLevel} / {level.xpForLevel} XP
        </Text>
        <Text variant="caption" color="secondary">
          Noch {level.xpToNextLevel} XP bis Level {level.level + 1}
        </Text>
      </View>
      <Text variant="caption" color="muted">
        {totalXp} XP gesamt
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.xs },
  bottom: { flexDirection: 'row', justifyContent: 'space-between' },
});
