import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ANSWER_KEYS, answerOrder } from '@quizbyte/shared';
import type { AnswerKey } from '@quizbyte/shared';

import { AnswerOption } from '@/components/quiz/AnswerOption';
import type { AnswerOptionState } from '@/components/quiz/AnswerOption';
import { ExplanationCard } from '@/components/quiz/ExplanationCard';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizAmbientBackground } from '@/components/quiz/QuizAmbientBackground';
import { Button, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { useAnswerSharedQuestion, useConversation, useFriends } from '@/features/friends/useFriends';
import { fetchCategories } from '@/services/api/categoriesApi';
import { fetchQuestionsByIds } from '@/services/api/questionsApi';
import { getUserMessage } from '@/services/errors';
import { FixedTheme, makeStyles, spacing, useTheme, useThemeColors } from '@/theme';
import type { ColorScheme } from '@/theme';

/**
 * A question a friend sent, in the ordinary question view.
 *
 * The same backdrop, the same card, the same answer options as a quiz round –
 * a question from a friend is still a question, and answering it in a small
 * dialog made it feel like a form instead.
 *
 * It is not a round, though: no XP, no session, no level bar. What it is for is
 * the line at the end, which both of you get to see.
 */
export default function SharedQuestionScreen() {
  const { scheme } = useTheme();
  return (
    <FixedTheme scheme="dark">
      <StatusBar style="light" />
      <SharedQuestion contentScheme={scheme} />
    </FixedTheme>
  );
}

function SharedQuestion({ contentScheme }: { contentScheme: ColorScheme }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { id: messageId, friendId } = useLocalSearchParams<{ id: string; friendId?: string }>();

  const friends = useFriends();
  const friend = friends.friends.find((entry) => entry.id === friendId) ?? null;
  const friendName = friend?.displayName ?? friend?.username ?? 'Dein Freund';
  const conversation = useConversation(friendId ?? null);
  const answerQuestion = useAnswerSharedQuestion(friendId ?? null);

  const message = conversation.messages.find((entry) => entry.id === messageId) ?? null;
  const questionId = message?.questionId ?? null;

  const questions = useQuery({
    queryKey: ['friends', 'shared-question', questionId],
    queryFn: async () => {
      const list = await fetchCategories();
      const lookup = new Map(list.map((entry) => [entry.id, entry]));
      return fetchQuestionsByIds([questionId as string], lookup);
    },
    enabled: Boolean(questionId),
    staleTime: 5 * 60 * 1000,
  });
  const question = questions.data?.[0] ?? null;

  // Kept locally so the result is on screen the moment it is tapped, before the
  // conversation has been refetched.
  const [picked, setPicked] = useState<AnswerKey | null>(null);
  const given = message?.answer?.selectedAnswer ?? picked;

  if (conversation.isLoading || questions.isLoading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!message || !question) {
    return (
      <Screen>
        <EmptyState
          icon="help-circle-outline"
          title="Frage nicht gefunden"
          message="Vielleicht wurde sie zurückgezogen."
          actionLabel="Zurück"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const accent = question.categoryAccentColor ?? colors.primary;
  const keys = answerOrder(question.id);

  const state = (key: AnswerKey): AnswerOptionState => {
    if (!given) return 'default';
    // Die Loesung kommt erst mit der Abgabe – bis sie da ist, steht die
    // getippte Antwort auf "wird geprueft" statt auf "falsch".
    if (!question.correctAnswer) return key === given ? 'pending' : 'muted';
    if (key === question.correctAnswer) return 'correct';
    if (key === given) return 'wrong';
    return 'muted';
  };

  // Ob es richtig war, sagt der Server; das steht an der Nachricht. Der
  // Vergleich ist nur der Rueckfall fuer eine Antwort, die gerade erst getippt
  // wurde und deren Nachricht noch nicht neu geladen ist.
  const wasCorrect = message.answer?.isCorrect ?? (given !== null && given === question.correctAnswer);

  const answer = (key: AnswerKey) => {
    if (given) return;
    setPicked(key);
    answerQuestion.mutate({ messageId: message.id, answer: key });
  };

  return (
    <Screen backdrop={<QuizAmbientBackground accentColor={accent} questionId={question.id} />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück zum Chat" onPress={() => router.back()} />
        <View style={styles.titles}>
          <Text variant="label" style={styles.eyebrow} numberOfLines={1}>
            VON {friendName.toUpperCase()}
          </Text>
          <Text variant="headline">{question.categoryName}</Text>
        </View>
      </View>

      <FixedTheme scheme={contentScheme}>
        <QuestionCard question={question} />

        <View style={styles.answers} accessibilityRole="radiogroup">
          {keys.map((key, position) => (
            <AnswerOption
              key={key}
              answerKey={key}
              label={ANSWER_KEYS[position] ?? key}
              text={question.answers[key]}
              state={state(key)}
              disabled={Boolean(given) || answerQuestion.isPending}
              onPress={answer}
            />
          ))}
        </View>

        {/* No XP here – a question from a friend is not a round, and paying for
            it would make the chat a way to farm levels. */}
        {given && question.explanation ? (
          <ExplanationCard isCorrect={wasCorrect} explanation={question.explanation} xpEarned={0} />
        ) : null}
      </FixedTheme>

      {answerQuestion.isError ? (
        <Text color="danger" style={styles.error}>
          {getUserMessage(answerQuestion.error)}
        </Text>
      ) : null}

      {given ? (
        <>
          <Text variant="caption" color="muted" align="center" style={styles.note}>
            {friendName} sieht jetzt, wie du geantwortet hast.
          </Text>
          <Button title="Zurück zum Chat" onPress={() => router.back()} style={styles.next} />
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  titles: { flex: 1, gap: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  answers: { gap: spacing.sm, marginTop: spacing.xl },
  loading: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  error: { marginTop: spacing.md },
  note: { marginTop: spacing.lg },
  next: { marginTop: spacing.md },
}));
