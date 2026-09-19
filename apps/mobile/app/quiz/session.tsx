import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { ANSWER_KEYS, answerOrder, computeLevelProgress, countMistakes, livesLeft, quizModeById, xpConfig } from '@quizbyte/shared';
import type { AnswerKey } from '@quizbyte/shared';

import { SendToFriendDialog } from '@/components/friends/SendToFriendDialog';
import { AnswerOption } from '@/components/quiz/AnswerOption';
import type { AnswerOptionState } from '@/components/quiz/AnswerOption';
import { ExplanationCard } from '@/components/quiz/ExplanationCard';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizAmbientBackground } from '@/components/quiz/QuizAmbientBackground';
import { QuizHud } from '@/components/quiz/QuizHud';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { LevelPill } from '@/components/progress/LevelPill';
import { QuizSettingsDialog } from '@/components/quiz/QuizSettingsDialog';
import { ReportQuestionDialog } from '@/components/quiz/ReportQuestionDialog';
import { Button, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { categoryImage } from '@/content/categoryImages';
import { useSavedQuestionIds, useToggleSavedQuestion } from '@/features/progress/useSavedQuestions';
import { useFeature } from '@/state/featureStore';
import { useQuizController } from '@/features/quiz/useQuizController';
import { shareQuestion } from '@/services/share/shareQuestion';
import { FixedTheme, makeStyles, radius, spacing, useTheme, useThemeColors } from '@/theme';
import type { ColorScheme } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function resolveCategoryIcon(icon: string | null): IoniconName {
  if (icon && icon in Ionicons.glyphMap) return icon as IoniconName;
  return 'pricetag-outline';
}

/** Badge letters follow the position on screen, so they always read A-B-C-D. */
const POSITION_LABELS = ANSWER_KEYS;

/**
 * Wie eine Antwortmöglichkeit aussieht.
 *
 * `correct` ist null, solange der Server die Lösung nicht herausgibt – im
 * Duell bis zur Abgabe. Dann ist die getippte Antwort "unterwegs" und die
 * übrigen treten zurück; eingefärbt wird erst, wenn die Antwort da ist.
 */
function optionState(
  key: AnswerKey,
  correct: AnswerKey | null,
  selected: AnswerKey | null,
  pending: AnswerKey | null,
): AnswerOptionState {
  if (pending) return key === pending ? 'pending' : 'muted';
  if (!selected) return 'default';
  if (!correct) return key === selected ? 'pending' : 'muted';
  if (key === correct) return 'correct';
  if (key === selected) return 'wrong';
  return 'muted';
}

/**
 * The quiz keeps QuizByte's dark, category-tinted backdrop in both themes: the
 * wash belongs to the category and looks the same either way. The cards on top
 * of it still follow the user's theme.
 */
export default function QuizSessionScreen() {
  // Read before the dark theme takes over, so the cards inside can go back to
  // whatever the user actually picked.
  const { scheme } = useTheme();

  return (
    <FixedTheme scheme="dark">
      {/* Light status bar icons: the backdrop is dark even in the light theme. */}
      <StatusBar style="light" />
      <QuizSession contentScheme={scheme} />
    </FixedTheme>
  );
}

function QuizSession({ contentScheme }: { contentScheme: ColorScheme }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const quiz = useQuizController();
  // Geteilte Fragen haengen am Schalter – auch der Knopf, der eine schickt.
  const sharingEnabled = useFeature('questionSharing');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // The question being sent to a friend – null while the sheet is closed.
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  // A one-line question leaves a lot of empty space – push the answers further down.
  const [questionLines, setQuestionLines] = useState(2);
  const { session, question, attempt } = quiz;

  // Bookmarks for this round. The query is the truth; the override keeps the
  // icon in sync during the round-trip and is rolled back if the write fails.
  const savedIds = useSavedQuestionIds(session?.questions.map((entry) => entry.id) ?? []);
  const toggleSaved = useToggleSavedQuestion();
  const [savedOverride, setSavedOverride] = useState<Record<string, boolean>>({});

  /*
    A duel that has been started belongs to two people.

    Walking away from it used to leave the round open: the session was never
    completed, so the duel sat there until its three days ran out and the other
    player waited for nothing. Leaving now ends the round and counts what was
    answered – which is also the only honest reading of "he left", because the
    questions he did answer were answered.

    Asked first, because it cannot be taken back, and blocked for the swipe:
    a gesture is too easy to make by accident for something with a score on it.
  */
  const duelInProgress = session?.sessionType === 'duel' && session.attempts.length > 0 && !quiz.finishing;

  const confirmLeaveDuel = useCallback(() => {
    Alert.alert(
      'Duell abbrechen?',
      'Das Duell wird hier beendet und mit deinem aktuellen Stand gewertet. Weiterspielen kannst du danach nicht mehr.',
      [
        { text: 'Weiterspielen', style: 'cancel' },
        { text: 'Beenden', style: 'destructive', onPress: () => void quiz.retryFinish() },
      ],
    );
  }, [quiz]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !duelInProgress });
  }, [duelInProgress, navigation]);

  /*
    Leaving by the back-swipe or the Android button instead of the arrow. For
    everything but a running duel the navigation has already happened by the
    time this fires, so the round only needs dropping – the answers given so
    far are flushed to the server on the way out. It is safe to run on a
    finished round too, where there is no session left to drop.
  */
  const { abandonSession } = quiz;
  useEffect(() => {
    const listener = (event: { preventDefault: () => void }) => {
      if (!duelInProgress) {
        abandonSession();
        return;
      }
      event.preventDefault();
      confirmLeaveDuel();
    };
    return navigation.addListener('beforeRemove', listener);
  }, [abandonSession, confirmLeaveDuel, duelInProgress, navigation]);

  const toggleSave = (questionId: string, next: boolean) => {
    setSavedOverride((previous) => ({ ...previous, [questionId]: next }));
    toggleSaved.mutate(
      { questionId, saved: next },
      { onError: () => setSavedOverride((previous) => ({ ...previous, [questionId]: !next })) },
    );
  };

  if (!session || !question) {
    return (
      <Screen>
        {/*
          While the round is being wrapped up the session is already gone but
          the result screen is not up yet. Saying "no active quiz" there would
          be a lie for a frame or two.
        */}
        {quiz.finishing ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <EmptyState title="Kein aktives Quiz" actionLabel="Zur Startseite" onAction={() => router.dismissTo('/(tabs)')} />
        )}
      </Screen>
    );
  }

  const selected = attempt?.selectedAnswer ?? null;
  // Random sessions keep the app's blue; a category run takes on its own colour.
  const accent = session.sessionType === 'random' ? colors.primary : (question.categoryAccentColor ?? colors.primary);
  const categoryName = session.sessionType === 'category' ? session.categoryName : question.categoryName;
  // Always the current question's category, even in a mixed round – the badge
  // is what says which one you are being asked about right now.
  const categoryArt = categoryImage(question.categorySlug);
  // The server total only refreshes when the round ends, so add up what this
  // round has earned so far – that way the level moves with every answer.
  const earnedSoFar = session.attempts.reduce((sum, entry) => sum + entry.xpEarned, 0);
  const liveLevel = computeLevelProgress(session.startTotalXp + earnedSoFar);
  const isSaved = savedOverride[question.id] ?? savedIds.has(question.id);
  // Shuffled per question and session, stable while the question is on screen.
  const answerKeys = answerOrder(question.id, session.sessionId);

  // In a timed round the bar counts down the clock: how many of thirty possible
  // questions are behind you says nothing when the seconds are what run out.
  const modeRules = quizModeById(session.mode);
  const timeLimitMs = (modeRules.timeLimitSeconds ?? 0) * 1000;
  const timed = quiz.remainingMs !== null && timeLimitMs > 0;
  const timeUrgent = timed && (quiz.remainingMs ?? 0) <= 10_000;
  // The round is over because the mode says so, not because the questions ran out.
  const outOfLives = modeRules.lives !== null && countMistakes(session.attempts) >= modeRules.lives;
  // Repeats are practice and pay nothing, but a right answer is a right answer.
  const correctSoFar = session.attempts.filter((entry) => entry.isCorrect).length;

  return (
    <Screen backdrop={<QuizAmbientBackground accentColor={accent} questionId={question.id} />}>
      {/* Top bar: back | progress | report | settings */}
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={duelInProgress ? 'Duell abbrechen' : 'Quiz beenden'}
          onPress={duelInProgress ? confirmLeaveDuel : quiz.leave}
        />

        <View style={styles.progressColumn}>
          {/* Sits right on top of the bar instead of on its own line – the daily
              round is the only session type whose payout differs. */}
          {session.sessionType === 'daily' ? (
            <View style={styles.dailyRow}>
              <Text variant="label" style={styles.dailyLabel}>
                Daily Quiz
              </Text>
              <View style={styles.dailyBadge}>
                <Ionicons name="flash" size={11} color={colors.warning} />
                <Text variant="label" style={styles.dailyBadgeText}>
                  {xpConfig.DAILY_XP_MULTIPLIER}× XP
                </Text>
              </View>
            </View>
          ) : session.mode !== 'classic' ? (
            <Text variant="label" style={styles.modeName} numberOfLines={1}>
              {modeRules.name}
            </Text>
          ) : null}
          <QuizProgress
            current={session.currentIndex + 1}
            total={session.questions.length}
            percent={timed ? 100 - ((quiz.remainingMs ?? 0) / timeLimitMs) * 100 : undefined}
            color={timeUrgent ? colors.danger : undefined}
            openEnded={modeRules.openEnded}
            label={timed ? `Noch ${Math.ceil((quiz.remainingMs ?? 0) / 1000)} Sekunden` : undefined}
          />
        </View>

        <IconButton icon="flag-outline" accessibilityLabel="Frage melden" size={21} onPress={() => setReportOpen(true)} />
        <IconButton icon="options-outline" accessibilityLabel="Quiz-Einstellungen" onPress={() => setSettingsOpen(true)} />
      </View>

      {/* Level – the quiz shows it too, and celebrates a level-up on the spot */}
      <View style={styles.levelRow}>
        <LevelPill level={liveLevel} />
      </View>

      {/* Category badge – mixed sessions show the current question's category –
          and beside it what the round stands at. */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: `${accent}1F`, borderColor: `${accent}66` }]}>
          {/* The category's own artwork, the same picture as on its tile –
              the tinted glyph is only left for categories without one. */}
          {categoryArt ? (
            <Image
              source={categoryArt}
              style={styles.badgeImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
            />
          ) : (
            <Ionicons name={resolveCategoryIcon(question.categoryIcon)} size={14} color={accent} />
          )}
          <Text variant="label" style={[styles.badgeText, { color: accent }]} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>

        <QuizHud
          mode={session.mode}
          livesLeft={livesLeft(session.mode, session.attempts)}
          remainingMs={quiz.remainingMs}
          correct={correctSoFar}
          answered={session.attempts.length}
        />
      </View>

      {/*
        Question, options and explanation follow the theme the user picked –
        white cards with dark text in light mode. Only the backdrop around them
        and the chrome on top of it stay dark in both themes.
      */}
      <FixedTheme scheme={contentScheme}>
        {/* Question. The key remounts it per question, so a hint or an open
            image never carries over to the next one. */}
        <QuestionCard
          key={question.id}
          question={question}
          sessionIndex={session.currentIndex}
          sessionTotal={session.questions.length}
          onLineCount={setQuestionLines}
          seen={session.seenQuestionIds.includes(question.id)}
        />

        {/* Answers – generous spacing above */}
        <View style={[styles.answers, questionLines <= 1 && styles.answersRoomy]} accessibilityRole="radiogroup">
          {answerKeys.map((key, position) => (
            <AnswerOption
              key={key}
              answerKey={key}
              // The badge follows the position on screen, not the stored key –
              // otherwise the letters would read out of order.
              label={POSITION_LABELS[position] ?? key}
              text={question.answers[key]}
              state={optionState(key, question.correctAnswer, selected, quiz.pendingAnswer)}
              disabled={Boolean(attempt) || Boolean(quiz.pendingAnswer)}
              onPress={quiz.answer}
            />
          ))}
        </View>

        {/* Eine Duellantwort, die nicht ankam: hier steht, warum – und dass ein
            zweiter Tipp reicht. Sie steht ausserhalb des Antwort-Blocks, weil es
            in genau diesem Fall noch keine Antwort gibt. */}
        {quiz.answerError ? (
          <Text color="danger" style={styles.error}>
            {quiz.answerError}
          </Text>
        ) : null}

        {attempt ? (
          <ExplanationCard isCorrect={attempt.isCorrect} explanation={question.explanation} xpEarned={attempt.xpEarned} />
        ) : null}
      </FixedTheme>

      {attempt ? (
        <>
          {/* Why it stops here – without this the round would just end. */}
          {outOfLives ? (
            <Text color="danger" style={styles.roundOver}>
              {session.mode === 'perfect'
                ? 'Ein Fehler – die perfekte Runde ist vorbei.'
                : 'Keine Leben mehr – die Runde ist vorbei.'}
            </Text>
          ) : null}
          {quiz.finishError ? (
            <Text color="danger" style={styles.error}>
              {quiz.finishError}
            </Text>
          ) : null}
          <View style={styles.nextRow}>
            <Button
              title={quiz.isLast ? 'Ergebnis anzeigen' : 'Weiter'}
              onPress={quiz.finishError ? () => void quiz.retryFinish() : quiz.continueOrFinish}
              loading={quiz.finishing}
              style={styles.next}
            />

            {/* Puts this question at the end of the round instead of letting it
                go. It is practice from there on: no XP, no life, nothing in the
                statistics – otherwise it would be a way to farm. */}
            {quiz.canRepeatLater ? (
              <Button
                title="Später wiederholen"
                variant="secondary"
                onPress={quiz.repeatCurrentLater}
                disabled={quiz.finishing}
              />
            ) : null}
          </View>
        </>
      ) : null}

      {/* Save + share – bottom right */}
      <View style={styles.shareRow}>
        <Pressable
          onPress={() => toggleSave(question.id, !isSaved)}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          accessibilityLabel={isSaved ? 'Frage nicht mehr speichern' : 'Frage speichern'}
          style={({ pressed }) => [styles.shareButton, isSaved && styles.saveActive, pressed && styles.sharePressed]}
        >
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={17} color={isSaved ? colors.primary : colors.textSecondary} />
          <Text variant="label" style={[styles.shareText, isSaved && styles.saveActiveText]}>
            {isSaved ? 'Gespeichert' : 'Speichern'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void shareQuestion(question)}
          accessibilityRole="button"
          accessibilityLabel="Frage teilen"
          style={({ pressed }) => [styles.shareButton, pressed && styles.sharePressed]}
        >
          <Ionicons name="share-outline" size={17} color={colors.textSecondary} />
          <Text variant="label" style={styles.shareText}>
            Teilen
          </Text>
        </Pressable>

        {/* Inside the app rather than out of it: the question lands in the
            friend's chat, where they can answer it and you see what they
            picked. "Teilen" beside it still goes to WhatsApp and the rest.
            Haengt am Schalter: ohne geteilte Fragen gibt es auch keinen Knopf,
            der eine schickt. */}
        {sharingEnabled ? (
        <Pressable
          onPress={() => setSendingTo(question.id)}
          accessibilityRole="button"
          accessibilityLabel="Frage an einen Freund senden"
          style={({ pressed }) => [styles.shareButton, pressed && styles.sharePressed]}
        >
          <Ionicons name="paper-plane-outline" size={17} color={colors.textSecondary} />
          <Text variant="label" style={styles.shareText}>
            Freund senden
          </Text>
        </Pressable>
        ) : null}
      </View>

      {/* Dialogs cover the whole screen, so they follow the app's theme like
          every other dialog rather than the quiz backdrop. */}
      <FixedTheme scheme={contentScheme}>
        <QuizSettingsDialog visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {reportOpen ? (
          <ReportQuestionDialog key={question.id} visible question={question} onClose={() => setReportOpen(false)} />
        ) : null}
        <SendToFriendDialog visible={sendingTo !== null} questionId={sendingTo} onClose={() => setSendingTo(null)} />
      </FixedTheme>
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  // Sits a little lower than the icons beside it, so the label above the bar
  // has room without crowding the row.
  progressColumn: { flex: 1, gap: spacing.xs, paddingTop: spacing.md },
  dailyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dailyLabel: { fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3, color: colors.textPrimary },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  dailyBadgeText: { fontSize: 10, letterSpacing: 0.3, color: colors.warning },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center', color: colors.textPrimary },
  levelRow: { alignItems: 'center', marginBottom: spacing.md },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  badge: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  // Slightly taller than the glyph it replaces: a photo needs the room to be
  // recognisable, and the pill grows with it.
  badgeImage: { width: 22, height: 22, borderRadius: radius.sm },
  badgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  answers: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  /** A one-line question leaves the card short – give the answers more room. */
  answersRoomy: { marginTop: spacing.xxxl },
  loading: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  roundOver: { marginTop: spacing.lg, textAlign: 'center' },
  error: { marginTop: spacing.md },
  nextRow: { gap: spacing.sm, marginTop: spacing.lg },
  next: {},
  // Wraps: three buttons no longer fit one line on a narrow phone, and they
  // read better stacked than squeezed.
  shareRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sharePressed: { backgroundColor: colors.surfacePressed, opacity: 0.85 },
  saveActive: { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
  saveActiveText: { color: colors.primary },
  shareText: { fontSize: 12, color: colors.textSecondary },
}));
