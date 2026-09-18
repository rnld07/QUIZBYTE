import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { accuracyTone, achievableXpForSession, computeLevelProgress, quizModeLabel, summarizeSession } from '@quizbyte/shared';
import type { SessionSummary } from '@quizbyte/shared';

import { DailyWheelDialog } from '@/components/quiz/DailyWheelDialog';
import { DuelResult } from '@/components/result/DuelResult';
import { BlitzResult, ClassicResult, PerfectResult, SurvivalResult } from '@/components/result/ModeResults';
import type { ModeResultProps } from '@/components/result/ModeResults';
import { ResultHero } from '@/components/result/ResultParts';
import { SessionReview } from '@/components/result/SessionReview';
import { Button, Card, EmptyState, IconButton, ProgressBar, Screen, Text } from '@/components/ui';
import { useDuel } from '@/features/friends/useFriends';
import { useCompletedSession } from '@/features/quiz/useCompletedSession';
import { useDailyResultToday } from '@/features/quiz/useDailyQuiz';
import { useDailyWheel, useSpinDailyWheel } from '@/features/quiz/useDailyTasks';
import { useModeRecords } from '@/features/quiz/useModeRecords';
import { useStartQuiz } from '@/features/quiz/useStartQuiz';
import { useCategories } from '@/features/quiz/useCategories';
import { getUserMessage } from '@/services/errors';
import { useAuthStore } from '@/state/authStore';
import { useQuizSessionStore } from '@/state/quizSessionStore';
import type { CompletedQuizSession } from '@/state/quizSessionStore';
import { makeStyles, spacing, useAccuracyColors, useThemeColors } from '@/theme';

/** Each mode gets its own page; the daily round has one of its own below. */
const MODE_RESULTS = {
  classic: ClassicResult,
  blitz: BlitzResult,
  survival: SurvivalResult,
  perfect: PerfectResult,
} as const;

export default function QuizResultScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  // An explicit id opens an older round (e.g. today's daily from the home screen).
  const { session: sessionParam } = useLocalSearchParams<{ session?: string }>();
  const lastCompleted = useQuizSessionStore((state) => state.lastCompleted);
  const startQuiz = useStartQuiz();
  const categories = useCategories();
  /*
    The other half of a duel: polled until it is settled, so the page can stop
    saying "waiting" the moment the other player is done. Read from the store
    directly – hooks run before the guards below sort out which round this is.
  */
  const duelState = useDuel(lastCompleted?.duelId ?? null);
  const myId = useAuthStore((state) => state.userId);
  // Unlocked by a flawless daily round – the server decides, not this screen.
  const wheel = useDailyWheel();
  const spin = useSpinDailyWheel();
  /*
    A flawless daily round puts the wheel in front of everything else, and it
    stays there until it is closed by hand.

    Two flags, both about this visit: whether the wheel was turned here, and
    whether the window was shut. The window used to be tied to the spin being
    untaken, which shut it in the same instant the wheel came to rest – and
    then showed the same wheel again on the page behind it.

    A spin left untaken is not lost: the day's result stays reachable from the
    daily card, and the window opens again on the next visit.
  */
  const [spunHere, setSpunHere] = useState(false);
  const [wheelClosed, setWheelClosed] = useState(false);

  // The in-memory round wins; anything else is rebuilt from the server.
  const fromStore = sessionParam ? (lastCompleted?.sessionId === sessionParam ? lastCompleted : null) : lastCompleted;
  const restored = useCompletedSession(sessionParam ?? null, !fromStore);
  const result = fromStore ?? restored.session;

  const summary = useMemo(() => (result ? summarizeSession(result.questions, result.attempts) : null), [result]);

  // Bests without this round, so a new one can be recognised as new.
  const records = useModeRecords(result?.sessionId ?? null);

  // Only the first daily round of the day pays out. A repeat legitimately ends
  // at 0 XP, so its bar reports what that first round actually scored.
  const isRepeatedDaily = result?.sessionType === 'daily' && Boolean(result.repeatedDaily);
  const firstRun = useDailyResultToday(isRepeatedDaily);


  if (restored.isLoading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!result || !summary) {
    return (
      <Screen>
        <EmptyState title="Kein Ergebnis vorhanden" actionLabel="Zur Startseite" onAction={() => router.dismissTo('/(tabs)')} />
      </Screen>
    );
  }

  const levelBefore = computeLevelProgress(result.startTotalXp);
  const levelAfter = computeLevelProgress(result.totalXpAfter);
  const leveledUp = levelAfter.level > levelBefore.level;
  const totalXp = summary.answerXp + result.completionBonusXp;
  const category = result.categoryId ? categories.data?.find((entry) => entry.id === result.categoryId) : undefined;
  const isDaily = result.sessionType === 'daily';
  const isDuel = result.sessionType === 'duel';

  const modeProps: ModeResultProps = {
    result,
    summary,
    totalXp,
    levelAfter,
    levelBefore,
    leveledUp,
    record: records.recordFor(result.mode),
  };
  const ModeResult = MODE_RESULTS[result.mode];

  const playAgain = () => {
    if (result.sessionType === 'category' && category) {
      void startQuiz.start({ type: 'category', category, mode: result.mode });
    } else if (result.sessionType === 'random') {
      void startQuiz.start({ type: 'random', mode: result.mode });
    } else if (result.sessionType === 'daily') {
      void startQuiz.start({ type: 'daily' });
    } else {
      router.dismissTo('/(tabs)/progress');
    }
  };

  /** Same category, different rules – back to the page the round started on. */
  const changeMode = () =>
    router.dismissTo(
      result.categoryId ? { pathname: '/quiz/modes', params: { categoryId: result.categoryId } } : '/quiz/modes',
    );

  const replayable = result.sessionType === 'category' || result.sessionType === 'random';

  return (
    <Screen>
      {/* A duel is the one round that came from somewhere with its own screen:
          the chat, where the score lands and the other side is waiting. */}
      {result.duelFriendId ? (
        <View style={styles.topBar}>
          <IconButton
            icon="close"
            accessibilityLabel="Zurück zum Chat"
            onPress={() =>
              router.dismissTo({ pathname: '/friends/chat/[id]', params: { id: result.duelFriendId as string } })
            }
          />
        </View>
      ) : null}

      {/* A duel is not measured against your own last round but against one
          other person, so it gets its own page – see DuelResult. */}
      {isDuel ? (
        <DuelResult
          duel={duelState.duel}
          loading={duelState.isLoading}
          friendId={result.duelFriendId}
          summary={summary}
          myId={myId}
        />
      ) : isDaily ? (
        <DailyResult result={result} summary={summary} totalXp={totalXp} firstRun={firstRun} isRepeat={isRepeatedDaily} />
      ) : (
        <ModeResult {...modeProps} />
      )}

      {/*
        The wheel is spun in the window and nowhere else. On the page it was a
        second wheel for the same spin: one that appeared the moment the window
        shut, showing a prize that had already been paid.
      */}
      <DailyWheelDialog
        visible={
          isDaily && !wheelClosed && wheel.wheel?.available === true && (wheel.wheel.xpWon === null || spunHere)
        }
        xpWon={wheel.wheel?.xpWon ?? null}
        spinning={spin.isPending}
        error={spin.error ? getUserMessage(spin.error) : null}
        onSpin={() => spin.mutate(undefined, { onSuccess: () => setSpunHere(true) })}
        onClose={() => setWheelClosed(true)}
      />

      {/* What the round actually asked – collapsed until someone wants it. */}
      <SessionReview sessionId={result.sessionId} questions={result.questions} attempts={result.attempts} />

      {startQuiz.error ? <Text color="danger">{startQuiz.error}</Text> : null}

      <View style={styles.actions}>
        {result.sessionType !== 'weakness' ? (
          <Button
            title={isDaily ? 'Nochmal spielen' : `Nochmal: ${quizModeLabel(result.mode)}`}
            onPress={playAgain}
            loading={startQuiz.starting}
          />
        ) : (
          <Button title="Weiter trainieren" onPress={() => router.dismissTo('/(tabs)/progress')} />
        )}
        {replayable ? (
          <Button title="Anderer Modus" variant="secondary" onPress={changeMode} disabled={startQuiz.starting} />
        ) : null}
        <Button title="Zur Startseite" variant="secondary" onPress={() => router.dismissTo('/(tabs)')} disabled={startQuiz.starting} />
      </View>
    </Screen>
  );
}

interface DailyResultProps {
  result: CompletedQuizSession;
  summary: SessionSummary;
  totalXp: number;
  firstRun: { xpEarned: number; maxXp: number; correct: number; answered: number } | null | undefined;
  isRepeat: boolean;
}

/**
 * The daily round is a fixed set – what matters is how much of its XP you
 * collected, not the level bar. A repeat earns nothing itself, so the bar then
 * shows what the first round of the day scored.
 */
function DailyResult({ result, summary, totalXp, firstRun, isRepeat }: DailyResultProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColor = useAccuracyColors()[accuracyTone(summary.accuracy)];
  // Questions answered correctly at some earlier point can no longer pay, so
  // they are left out of the maximum – otherwise a perfect round still reads
  // as "100 of 144 XP".
  const roundMax = achievableXpForSession(result.questions, result.sessionType, result.attempts);
  const dailyXp = isRepeat ? (firstRun?.xpEarned ?? 0) : totalXp;
  const maxXp = isRepeat ? (firstRun?.maxXp ?? roundMax) : roundMax;

  return (
    <>
      <ResultHero
        eyebrow="DAILY QUIZ"
        headline={`${summary.correct} / ${summary.answered}`}
        caption={`${summary.accuracy} % richtig`}
        captionColor={accuracyColor}
      />

      <Card elevated style={styles.dailyCard}>
        <View style={styles.dailyRow}>
          <Text variant="bodyStrong">{isRepeat ? 'Dein Durchlauf von heute' : 'XP aus dieser Runde'}</Text>
          <Text variant="caption" color="secondary">
            {dailyXp} / {maxXp} XP
          </Text>
        </View>

        {/* Only with something to reach does a bar say anything. */}
        {/* Green: this bar is XP collected, not progress towards a level. */}
        {maxXp > 0 ? <ProgressBar value={(dailyXp / maxXp) * 100} height={8} color={colors.success} /> : null}

        {/* On a repeat the hero shows the round just played – the score of the
            round that counted belongs here, otherwise it is nowhere. */}
        {isRepeat && firstRun ? (
          <Text variant="bodyStrong">
            {firstRun.correct} von {firstRun.answered} richtig
          </Text>
        ) : null}

        <Text variant="caption" color="secondary">
          {maxXp === 0
            ? 'Diese Fragen hattest du alle schon einmal richtig – deshalb war heute nichts mehr zu holen. Um 0 Uhr warten neue.'
            : isRepeat
              ? 'Heute schon gespielt. Eine Wiederholung bringt keine weiteren XP.'
              : dailyXp >= maxXp
                ? 'Volle Punktzahl – mehr war heute nicht drin.'
                : `${maxXp - dailyXp} XP sind dir heute entgangen.`}
        </Text>
      </Card>
    </>
  );
}

const useStyles = makeStyles(() => ({
  loading: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  dailyCard: { gap: spacing.sm, marginBottom: spacing.lg },
  dailyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Right-aligned and above everything – the hero below it is centred, so a
  // close button in the flow would sit off to one side of nothing.
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  actions: { gap: spacing.md, marginTop: spacing.lg },
}));
