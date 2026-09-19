import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { AppHeader } from '@/components/layout/AppHeader';
import { CategoryCard, CategoryCardSkeleton, categoryToCardProps } from '@/components/quiz/CategoryCard';
import { DailyQuizCard } from '@/components/quiz/DailyQuizCard';
import { DailyTasksCard } from '@/components/quiz/DailyTasksCard';
import { FrameUnlockCard } from '@/components/profile/FrameUnlockCard';
import { EmptyState, ErrorState, InfoDialog, Screen, SectionHeading, Text } from '@/components/ui';
import { isComingSoon } from '@/config/categories';
import { appIcon } from '@/content/appIcons';
import { useCategories } from '@/features/quiz/useCategories';
import { useProfile, useSetProfileFrame } from '@/features/profile/useProfile';
import { useProgress } from '@/features/progress/useProgress';
import { useDailyQuizStatus } from '@/features/quiz/useDailyQuiz';
import { useClaimDailyTask, useDailyTasks } from '@/features/quiz/useDailyTasks';
import { RANDOM_CATEGORY_NAME, useStartQuiz } from '@/features/quiz/useStartQuiz';
import { getUserMessage } from '@/services/errors';
import { useFeature } from '@/state/featureStore';
import type { DailyTaskKey } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

export default function QuizHomeScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const categories = useCategories();
  const startQuiz = useStartQuiz();
  const tasks = useDailyTasks();
  const claim = useClaimDailyTask();
  const profile = useProfile();
  const { level } = useProgress();
  const frame = useSetProfileFrame();
  // Which task is being collected, so only that row shows a spinner.
  const [claiming, setClaiming] = useState<DailyTaskKey | null>(null);
  const daily = useDailyQuizStatus();
  // Der Schalter entscheidet ueber den Einstieg, nicht nur ueber den Tab.
  const dailyEnabled = useFeature('dailyQuiz');
  const router = useRouter();
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  // Driven by the pull gesture only – a background refetch must not open the
  // refresh spinner (it leaves a gap above the content until the next scroll).
  const [refreshing, setRefreshing] = useState(false);

  /** A category leads to the mode page, never straight into a round. */
  const chooseMode = (categoryId?: string) =>
    router.push(categoryId ? { pathname: '/quiz/modes', params: { categoryId } } : '/quiz/modes');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([categories.refetch(), daily.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen
      withTabBar
      scrollToTopKey="index"
      backdrop={<AmbientBackground />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.textSecondary} />
      }
    >
      <AppHeader />

      {/* Daily quiz – the one round that pays double. Der Schalter entscheidet,
          ob es sie gibt: ausgeschaltet gibt es auch keinen Einstieg. */}
      {dailyEnabled ? (
      <View style={styles.daily}>
        <DailyQuizCard
          done={daily.done}
          loading={startQuiz.startingKey === 'daily'}
          disabled={startQuiz.starting}
          onPress={() =>
            daily.sessionId
              ? router.push({ pathname: '/quiz/result', params: { session: daily.sessionId } })
              : void startQuiz.start({ type: 'daily' })
          }
        />
      </View>
      ) : null}

      {/* A rank that was just earned – frames are never put on by themselves. */}
      <FrameUnlockCard
        level={level?.level ?? 1}
        name={profile.data?.username ?? '?'}
        avatarConfig={profile.data?.avatarConfig}
        equipping={frame.isPending}
        onEquip={(id) => frame.mutate(id)}
      />

      {/* Three things the day asks for, beside the round it asks for. */}
      <View style={styles.head}>
        <SectionHeading
          title="Tagesaufgaben"
          badge={
            tasks.waitingXp > 0 ? (
              <View style={[styles.waiting, { borderColor: colors.success, backgroundColor: colors.successSoft }]}>
                <Text variant="label" style={{ color: colors.success }}>
                  +{tasks.waitingXp} XP
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      <View style={styles.daily}>
        <DailyTasksCard
          tasks={tasks.tasks}
          loading={tasks.isLoading}
          claiming={claiming}
          onClaim={(key) => {
            setClaiming(key);
            claim.mutate(key, { onSettled: () => setClaiming(null) });
          }}
        />
      </View>

      {/* Section heading – anchors the grid and lifts the visual hierarchy */}
      <View style={styles.head}>
        <SectionHeading title="Kategorien" />
      </View>

      {startQuiz.error ? (
        <View style={styles.inlineError}>
          <Text color="danger">{startQuiz.error}</Text>
        </View>
      ) : null}

      {/* Category grid */}
      {categories.isLoading ? (
        <View style={styles.grid}>
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
        </View>
      ) : categories.isError ? (
        <ErrorState message={getUserMessage(categories.error)} onRetry={() => void categories.refetch()} />
      ) : categories.data && categories.data.length > 0 ? (
        <View style={styles.grid}>
          {/* Random card – always first, styled as the primary action */}
          <CategoryCard
            name={RANDOM_CATEGORY_NAME}
            description="Fragen aus allen Kategorien"
            slug="random"
            accentColor={colors.primary}
            hero
            badge={{ label: 'Beliebt', icon: 'flame', tone: 'solid' }}
            onPress={() => chooseMode()}
          />
          {categories.data.map((category) => {
            const soon = isComingSoon(category.slug);
            return (
              <CategoryCard
                key={category.id}
                {...categoryToCardProps(category)}
                comingSoon={soon}
                onPress={() => (soon ? setComingSoonTitle(category.name) : chooseMode(category.id))}
              />
            );
          })}
        </View>
      ) : (
        <EmptyState title="Noch keine Kategorien" message="Sobald Inhalte veröffentlicht sind, erscheinen sie hier." />
      )}

      <InfoDialog
        visible={comingSoonTitle !== null}
        eyebrow={comingSoonTitle ?? undefined}
        title="Coming soon"
        message="Diese Kategorie ist bald verfügbar."
        symbol={appIcon('coming-soon')}
        // Tools, not a clock, and in the neutral tone: this is a statement, not
        // something to tap – the blue accent reads as an invitation.
        icon="construct-outline"
        tone="neutral"
        onClose={() => setComingSoonTitle(null)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  daily: { marginBottom: spacing.xl },
  head: { marginBottom: spacing.lg },
  pressed: { opacity: 0.7 },
  waiting: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  inlineError: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
}));
