import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Category } from '@quizbyte/shared';

import { colors, radius, spacing } from '@/theme';

import { PressableCard, Skeleton, Text } from '../ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

const FALLBACK_ICON: IoniconName = 'help-circle-outline';

function resolveIcon(icon: string | null): IoniconName {
  if (icon && icon in Ionicons.glyphMap) return icon as IoniconName;
  return FALLBACK_ICON;
}

interface CategoryCardProps {
  name: string;
  description: string | null;
  icon: string | null;
  accentColor?: string | null;
  questionCount?: number;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Tappable category tile – the whole card is the target, no chevrons. */
export function CategoryCard({ name, description, icon, accentColor, questionCount, loading, disabled, onPress }: CategoryCardProps) {
  const accent = accentColor ?? colors.primary;
  const hasQuestions = questionCount === undefined || questionCount > 0;

  return (
    <PressableCard
      onPress={onPress}
      disabled={disabled || !hasQuestions}
      accessibilityLabel={`${name} Quiz starten`}
      accessibilityHint={description ?? undefined}
      padding="lg"
      style={styles.card}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        {loading ? <ActivityIndicator color={accent} /> : <Ionicons name={resolveIcon(icon)} size={22} color={accent} />}
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {description ? (
          <Text variant="caption" color="secondary" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {questionCount !== undefined ? (
          <Text variant="label" color={hasQuestions ? 'muted' : 'secondary'} style={styles.count}>
            {hasQuestions ? `${questionCount} Fragen` : 'Noch keine Fragen'}
          </Text>
        ) : null}
      </View>
    </PressableCard>
  );
}

export function CategoryCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <Skeleton width={44} height={44} borderRadius={radius.md} />
      <View style={styles.texts}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="85%" height={12} />
      </View>
    </View>
  );
}

export function categoryToCardProps(category: Category) {
  return {
    name: category.name,
    description: category.description,
    icon: category.icon,
    accentColor: category.accentColor,
    questionCount: category.publishedQuestionCount,
  };
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84 },
  skeleton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: spacing.xxs },
  count: { marginTop: spacing.xxs },
});
