import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ANSWER_KEYS } from '@quizbyte/shared';
import type { AnswerKey } from '@quizbyte/shared';

import { AnswerOption } from '@/components/quiz/AnswerOption';
import type { AnswerOptionState } from '@/components/quiz/AnswerOption';
import { ExplanationCard } from '@/components/quiz/ExplanationCard';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { Button, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { useQuizController } from '@/features/quiz/useQuizController';
import { shareQuestion } from '@/services/share/shareQuestion';
import { spacing } from '@/theme';

function optionState(key: AnswerKey, correct: AnswerKey, selected: AnswerKey | null): AnswerOptionState {
  if (!selected) return 'default';
  if (key === correct) return 'correct';
  if (key === selected) return 'wrong';
  return 'muted';
}

export default function QuizSessionScreen() {
  const router = useRouter();
  const quiz = useQuizController();
  const { session, question, attempt } = quiz;

  // No active session (e.g. after a reload or right after completion): show a way home
  // instead of auto-redirecting, which would race with the navigation to the result.
  if (!session || !question) {
    return (
      <Screen>
        <EmptyState title="Kein aktives Quiz" actionLabel="Zur Startseite" onAction={() => router.dismissTo('/(tabs)')} />
      </Screen>
    );
  }

  const selected = attempt?.selectedAnswer ?? null;

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Quiz beenden" onPress={quiz.leave} />
        <Text variant="bodyStrong" numberOfLines={1} style={styles.topTitle}>
          {session.categoryName}
        </Text>
        <IconButton icon="share-outline" accessibilityLabel="Frage teilen" onPress={() => void shareQuestion(question)} />
      </View>

      <QuizProgress current={session.currentIndex + 1} total={session.questions.length} />

      <QuestionCard question={question} />

      <View style={styles.answers} accessibilityRole="radiogroup">
        {ANSWER_KEYS.map((key) => (
          <AnswerOption
            key={key}
            answerKey={key}
            text={question.answers[key]}
            state={optionState(key, question.correctAnswer, selected)}
            disabled={Boolean(attempt)}
            onPress={quiz.answer}
          />
        ))}
      </View>

      {attempt ? (
        <>
          <ExplanationCard isCorrect={attempt.isCorrect} explanation={question.explanation} xpEarned={attempt.xpEarned} />
          {quiz.finishError ? (
            <Text color="danger" style={styles.error}>
              {quiz.finishError}
            </Text>
          ) : null}
          <Button
            title={quiz.isLast ? 'Ergebnis anzeigen' : 'Weiter'}
            onPress={quiz.finishError ? () => void quiz.retryFinish() : quiz.continueOrFinish}
            loading={quiz.finishing}
            style={styles.next}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  topTitle: { flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
  answers: { gap: spacing.md },
  error: { marginTop: spacing.md },
  next: { marginTop: spacing.xl },
});
