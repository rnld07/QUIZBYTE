import { RefreshControl, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { CategoryCard, CategoryCardSkeleton, categoryToCardProps } from '@/components/quiz/CategoryCard';
import { EmptyState, ErrorState, Screen, Text } from '@/components/ui';
import { useCategories } from '@/features/quiz/useCategories';
import { RANDOM_CATEGORY_NAME, useStartQuiz } from '@/features/quiz/useStartQuiz';
import { getUserMessage } from '@/services/errors';
import { colors, spacing } from '@/theme';

export default function QuizHomeScreen() {
  const categories = useCategories();
  const startQuiz = useStartQuiz();

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={categories.isRefetching} onRefresh={() => void categories.refetch()} tintColor={colors.textSecondary} />
      }
    >
      <AppHeader />

      {startQuiz.error ? (
        <View style={styles.inlineError}>
          <Text color="danger">{startQuiz.error}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {categories.isLoading ? (
          <>
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
          </>
        ) : categories.isError ? (
          <ErrorState message={getUserMessage(categories.error)} onRetry={() => void categories.refetch()} />
        ) : categories.data && categories.data.length > 0 ? (
          <>
            <CategoryCard
              name={RANDOM_CATEGORY_NAME}
              description="Fragen aus allen Kategorien"
              icon="shuffle"
              loading={startQuiz.startingKey === 'random'}
              disabled={startQuiz.starting}
              onPress={() => void startQuiz.start({ type: 'random' })}
            />
            {categories.data.map((category) => (
              <CategoryCard
                key={category.id}
                {...categoryToCardProps(category)}
                loading={startQuiz.startingKey === `category:${category.id}`}
                disabled={startQuiz.starting}
                onPress={() => void startQuiz.start({ type: 'category', category })}
              />
            ))}
          </>
        ) : (
          <EmptyState title="Noch keine Kategorien" message="Sobald Inhalte veröffentlicht sind, erscheinen sie hier." />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  inlineError: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
});
