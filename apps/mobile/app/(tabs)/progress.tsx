import { RefreshControl, StyleSheet, View } from 'react-native';

import { computeAccuracy } from '@quizbyte/shared';

import { AppHeader } from '@/components/layout/AppHeader';
import { LevelCard } from '@/components/progress/LevelCard';
import { StatGrid, StatTile } from '@/components/progress/StatTile';
import { TopicRow } from '@/components/progress/TopicRow';
import { Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/components/ui';
import { useProgress } from '@/features/progress/useProgress';
import { useStats } from '@/features/progress/useStats';
import { useStartQuiz } from '@/features/quiz/useStartQuiz';
import { getUserMessage } from '@/services/errors';
import { colors, spacing } from '@/theme';

export default function ProgressScreen() {
  const progress = useProgress();
  const stats = useStats();
  const startQuiz = useStartQuiz();
  const data = progress.progress;
  const refreshing = progress.isRefetching;

  const onRefresh = () => {
    void progress.refetch();
    void stats.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}>
      <AppHeader />

      {progress.isError ? (
        <ErrorState message={getUserMessage(progress.error)} onRetry={() => void progress.refetch()} />
      ) : (
        <View style={styles.section}>
          <LevelCard level={progress.level} totalXp={data?.totalXp ?? 0} streak={progress.streak} loading={progress.isLoading} />
          <StatGrid>
            <StatTile label="Beantwortet" value={String(data?.totalQuestionsAnswered ?? 0)} loading={progress.isLoading} />
            <StatTile label="Richtig" value={String(data?.totalCorrectAnswers ?? 0)} loading={progress.isLoading} />
            <StatTile
              label="Accuracy"
              value={`${computeAccuracy(data?.totalCorrectAnswers ?? 0, data?.totalQuestionsAnswered ?? 0)} %`}
              loading={progress.isLoading}
            />
            <StatTile label="Quiz-Sessions" value={String(data?.totalSessionsCompleted ?? 0)} loading={progress.isLoading} />
            <StatTile label="Längster Streak" value={`${data?.longestStreak ?? 0} Tage`} loading={progress.isLoading} />
          </StatGrid>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="headline">Schwächen trainieren</Text>
        <Card>
          {stats.isLoading ? (
            <Skeleton height={44} />
          ) : stats.canTrainWeaknesses ? (
            <View style={styles.trainBlock}>
              <Text color="secondary">
                Wir haben {stats.report.weaknesses.length} {stats.report.weaknesses.length === 1 ? 'Thema' : 'Themen'} erkannt, in
                denen du noch unsicher bist.
              </Text>
              <View style={styles.chips}>
                {stats.report.weaknesses.map((topic) => (
                  <View key={`${topic.kind}:${topic.key}`} style={styles.chip}>
                    <Text variant="caption">
                      {topic.label} · {topic.accuracy} %
                    </Text>
                  </View>
                ))}
              </View>
              <Button
                title="Schwächen trainieren"
                onPress={() => void startQuiz.start({ type: 'weakness', focus: stats.focus })}
                loading={startQuiz.startingKey === 'weakness'}
                disabled={startQuiz.starting}
              />
              {startQuiz.error ? <Text color="danger">{startQuiz.error}</Text> : null}
            </View>
          ) : (
            <EmptyState
              compact
              icon="fitness-outline"
              title="Noch keine Schwächen erkannt"
              message="Beantworte zunächst ein paar Quizfragen. Danach können wir dir deine schwächsten Themen zeigen."
            />
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="headline">Leistung nach Kategorien</Text>
        <Card>
          {stats.isLoading ? (
            <View style={styles.skeletons}>
              <Skeleton height={18} />
              <Skeleton height={18} />
              <Skeleton height={18} />
            </View>
          ) : stats.isError ? (
            <ErrorState compact message={getUserMessage(stats.error)} onRetry={() => void stats.refetch()} />
          ) : stats.categories.length === 0 ? (
            <EmptyState compact icon="stats-chart-outline" title="Noch keine Daten" message="Spiele dein erstes Quiz, um Statistiken zu sehen." />
          ) : (
            stats.categories.map((topic) => <TopicRow key={topic.key} label={topic.label} accuracy={topic.accuracy} attempts={topic.attempts} />)
          )}
        </Card>
      </View>

      {stats.report.strengths.length > 0 ? (
        <View style={styles.section}>
          <Text variant="headline">Stärkste Themen</Text>
          <Card>
            {stats.report.strengths.map((topic) => (
              <TopicRow key={`${topic.kind}:${topic.key}`} label={topic.label} accuracy={topic.accuracy} attempts={topic.attempts} />
            ))}
          </Card>
        </View>
      ) : null}

      {stats.report.weaknesses.length > 0 ? (
        <View style={styles.section}>
          <Text variant="headline">Deine Schwächen</Text>
          <Card>
            {stats.report.weaknesses.map((topic) => (
              <TopicRow key={`${topic.kind}:${topic.key}`} label={topic.label} accuracy={topic.accuracy} attempts={topic.attempts} />
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginBottom: spacing.xl },
  trainBlock: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: colors.surfaceElevated },
  skeletons: { gap: spacing.md },
});
