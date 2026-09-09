import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { computeLevelProgress, summarizeSession } from '@quizbyte/shared';

import { Button, Card, ProgressBar, Screen, Text } from '@/components/ui';
import { useStartQuiz } from '@/features/quiz/useStartQuiz';
import { useCategories } from '@/features/quiz/useCategories';
import { useQuizSessionStore } from '@/state/quizSessionStore';
import { colors, spacing } from '@/theme';

export default function QuizResultScreen() {
  const router = useRouter();
  const result = useQuizSessionStore((state) => state.lastCompleted);
  const startQuiz = useStartQuiz();
  const categories = useCategories();

  useEffect(() => {
    if (!result) router.replace('/(tabs)');
  }, [result, router]);

  const summary = useMemo(() => (result ? summarizeSession(result.questions, result.attempts) : null), [result]);

  if (!result || !summary) return <Screen scroll={false} />;

  const levelBefore = computeLevelProgress(result.startTotalXp);
  const levelAfter = computeLevelProgress(result.totalXpAfter);
  const leveledUp = levelAfter.level > levelBefore.level;
  const totalXp = summary.answerXp + result.completionBonusXp;
  const category = result.categoryId ? categories.data?.find((entry) => entry.id === result.categoryId) : undefined;

  const playAgain = () => {
    if (result.sessionType === 'category' && category) {
      void startQuiz.start({ type: 'category', category });
    } else if (result.sessionType === 'random') {
      void startQuiz.start({ type: 'random' });
    } else {
      router.dismissTo('/(tabs)/progress');
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="label" color="secondary">
          {result.categoryName.toUpperCase()}
        </Text>
        <Text variant="display" style={styles.score}>
          {summary.correct} / {summary.answered}
        </Text>
        <Text variant="headline" color="secondary">
          {summary.accuracy} % richtig
        </Text>
        <Text variant="title" color="accent" style={styles.xp} accessibilityLabel={`${totalXp} XP erhalten`}>
          +{totalXp} XP
        </Text>
      </View>

      <Card elevated style={styles.levelCard}>
        <View style={styles.levelRow}>
          <Text variant="bodyStrong">Level {levelAfter.level}</Text>
          <Text variant="caption" color="secondary">
            {levelAfter.xpIntoLevel} / {levelAfter.xpForLevel} XP
          </Text>
        </View>
        <ProgressBar value={levelAfter.progressPercent} height={8} />
        {leveledUp ? (
          <Text variant="bodyStrong" color="accent">
            Level-Up! Du hast Level {levelAfter.level} erreicht.
          </Text>
        ) : (
          <Text variant="caption" color="secondary">
            Noch {levelAfter.xpToNextLevel} XP bis Level {levelAfter.level + 1}
          </Text>
        )}
      </Card>

      {summary.strongestTopic || summary.weakestTopic ? (
        <Card style={styles.topics}>
          {summary.strongestTopic ? (
            <View style={styles.topicRow}>
              <Text color="secondary">Stärkstes Thema</Text>
              <Text variant="bodyStrong" color="success">
                {summary.strongestTopic.label} · {summary.strongestTopic.accuracy} %
              </Text>
            </View>
          ) : null}
          {summary.weakestTopic ? (
            <View style={styles.topicRow}>
              <Text color="secondary">Schwächstes Thema</Text>
              <Text variant="bodyStrong" color="danger">
                {summary.weakestTopic.label} · {summary.weakestTopic.accuracy} %
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {startQuiz.error ? <Text color="danger">{startQuiz.error}</Text> : null}

      <View style={styles.actions}>
        {result.sessionType !== 'weakness' ? (
          <Button title="Nochmal spielen" onPress={playAgain} loading={startQuiz.starting} />
        ) : (
          <Button title="Weiter trainieren" onPress={() => router.dismissTo('/(tabs)/progress')} />
        )}
        <Button title="Andere Kategorie" variant="secondary" onPress={() => router.dismissTo('/(tabs)')} disabled={startQuiz.starting} />
        <Button title="Zur Startseite" variant="ghost" onPress={() => router.dismissTo('/(tabs)')} disabled={startQuiz.starting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
  score: { marginTop: spacing.sm },
  xp: { marginTop: spacing.md },
  levelCard: { gap: spacing.sm, marginBottom: spacing.lg },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topics: { gap: spacing.md, marginBottom: spacing.lg, borderColor: colors.border },
  topicRow: { gap: spacing.xxs },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
