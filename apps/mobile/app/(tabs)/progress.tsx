import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { computeAccuracy } from '@quizbyte/shared';
import type { CategoryProgressRow, QuizQuestion } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { AppHeader } from '@/components/layout/AppHeader';
import { CategoryDetailDialog } from '@/components/progress/CategoryDetailDialog';
import { LevelCard } from '@/components/progress/LevelCard';
import { QuestionListDialog } from '@/components/progress/QuestionListDialog';
import { TOPIC_CARD_WIDTH, TopicCard } from '@/components/progress/TopicCard';
import { SavedQuestionRow } from '@/components/progress/SavedQuestionRow';
import { AppIcon, EmptyState, ErrorState, RaisedCard, Screen, SectionHeading, Skeleton, Text } from '@/components/ui';
import { useAnswerStats } from '@/features/progress/useAnswerStats';
import { useProgress } from '@/features/progress/useProgress';
import { useSavedQuestions, useToggleSavedQuestion } from '@/features/progress/useSavedQuestions';
import { useWrongQuestionCount } from '@/features/progress/useWrongQuestions';
import { useStats } from '@/features/progress/useStats';
import { useCategories } from '@/features/quiz/useCategories';
import { useStartQuiz } from '@/features/quiz/useStartQuiz';
import type { QuestionOutcomeFilter } from '@/services/api/questionsApi';
import { useFeature } from '@/state/featureStore';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

/** The outline of a drawn button. Near-black in both themes: ink, not a hue. */
const INK = 'rgba(3, 7, 13, 0.75)';

/** Only the newest bookmarks are listed inline; the rest live in the dialog. */
const SAVED_PREVIEW = 3;

export default function ProgressScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const progress = useProgress();
  const stats = useStats();
  // Counted per question, not per answer – see get_my_answer_stats.
  const answers = useAnswerStats();
  const wrongQuestions = useWrongQuestionCount();
  const saved = useSavedQuestions();
  const toggleSaved = useToggleSavedQuestion();
  const startQuiz = useStartQuiz();
  // Ohne den Schalter kein Einstieg ins Schwaechentraining.
  const weaknessEnabled = useFeature('weaknessTraining');
  const categories = useCategories();
  const router = useRouter();
  // Only a real pull-to-refresh may drive the RefreshControl. Binding it to the
  // query's background refetch makes the spinner appear on its own and leaves a
  // gap above the content until the next scroll.
  const [refreshing, setRefreshing] = useState(false);
  // Non-null while the question drill-down sits on top of the category sheet.
  const [questionFilter, setQuestionFilter] = useState<QuestionOutcomeFilter | null>(null);
  // The row is swiped, so it can hold more than a stack could; the full list
  // with its drill-down still lives in the dialog.
  const topCategories = stats.allCategories.slice(0, 8);
  // The focused category is tracked by id so a refetch keeps the dialog current.
  const [detail, setDetail] = useState<{ open: boolean; categoryId: string | null }>({ open: false, categoryId: null });
  const detailCategory = stats.allCategories.find((entry) => entry.id === detail.categoryId) ?? null;
  const openDetail = (category: CategoryProgressRow | null) => setDetail({ open: true, categoryId: category?.id ?? null });

  /**
   * Started from the screen, not from the dialog: closing the sheets unmounts
   * them, and the session must keep running past that.
   */
  const replayQuestions = (questions: QuizQuestion[], label?: string, categoryId?: string | null) => {
    setQuestionFilter(null);
    setDetail({ open: false, categoryId: null });
    void startQuiz.start({
      type: 'replay',
      questions,
      label: label ?? detailCategory?.label ?? 'Wiederholung',
      categoryId: categoryId ?? detailCategory?.id ?? null,
    });
  };

  /** Straight from the category sheet into a quiz of that category. */
  const startCategoryQuiz = (row: CategoryProgressRow) => {
    const category = categories.data?.find((entry) => entry.id === row.id);
    if (!category) return;
    setQuestionFilter(null);
    setDetail({ open: false, categoryId: null });
    void startQuiz.start({ type: 'category', category });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([progress.refetch(), stats.refetch(), answers.refetch(), wrongQuestions.refetch(), saved.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen
      withTabBar
      scrollToTopKey="progress"
      backdrop={<AmbientBackground />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.textSecondary} />}
    >
      <AppHeader showLevel={false} />

      {/* Level ring + answered questions + share of correct answers */}
      {progress.isError ? (
        <ErrorState message={getUserMessage(progress.error)} onRetry={() => void progress.refetch()} />
      ) : (
        <View style={styles.section}>
          <LevelCard
            level={progress.level}
            questionsAnswered={answers.answered}
            accuracy={computeAccuracy(answers.correct, answers.answered)}
            streak={progress.streak}
            loading={progress.isLoading}
            onPress={() => router.push('/analysis')}
          />
        </View>
      )}

      {/* Category performance – top 3, details behind a tap */}
      <View style={styles.section}>
        <SectionHeading
          title="Kategorien"
          trailing={
            topCategories.length > 0 ? (
              <Pressable
                onPress={() => router.push('/categories')}
                accessibilityRole="button"
                accessibilityLabel="Alle Kategorien anzeigen"
                hitSlop={8}
                style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
              >
                <Text variant="caption" color="accent">
                  Alle anzeigen
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </Pressable>
            ) : null
          }
        />

        {stats.isLoading ? (
          <View style={styles.topics}>
            <Skeleton width={TOPIC_CARD_WIDTH} height={150} borderRadius={radius.xl} />
            <Skeleton width={TOPIC_CARD_WIDTH} height={150} borderRadius={radius.xl} />
            <Skeleton width={TOPIC_CARD_WIDTH} height={150} borderRadius={radius.xl} />
          </View>
        ) : stats.isError ? (
          <RaisedCard style={styles.card}>
            <ErrorState compact message={getUserMessage(stats.error)} onRetry={() => void stats.refetch()} />
          </RaisedCard>
        ) : topCategories.length === 0 ? (
          <RaisedCard style={styles.card}>
            <EmptyState compact icon="stats-chart-outline" title="Noch keine Daten" message="Spiele dein erstes Quiz, um Statistiken zu sehen." />
          </RaisedCard>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topics}
            // The cards are the content; the tab scrolls up and down around it.
            accessibilityLabel="Kategorien, seitlich scrollbar"
          >
            {topCategories.map((topic, place) => (
              <TopicCard
                key={topic.id}
                rank={place + 1}
                label={topic.label}
                accuracy={topic.accuracy}
                attempts={topic.attempts}
                correct={topic.correct}
                accentColor={topic.accentColor}
                slug={topic.slug}
                onPress={() => openDetail(topic)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Replay every wrongly answered question. Ohne den Schalter gibt es den
          Abschnitt nicht – ein Einstieg, der ins Leere fuehrt, ist schlimmer
          als keiner. */}
      {weaknessEnabled ? (
      <View style={styles.section}>
        <SectionHeading title="Schwächen trainieren" />
        <Pressable
          onPress={() => void startQuiz.start({ type: 'mistakes' })}
          disabled={startQuiz.starting || wrongQuestions.count === 0}
          accessibilityRole="button"
          accessibilityLabel={`Schwächen trainieren, ${wrongQuestions.count} offene Fragen`}
          accessibilityState={{ disabled: startQuiz.starting || wrongQuestions.count === 0 }}
          style={({ pressed }) => [styles.trainCard, pressed && styles.trainPressed]}
        >
          <View style={styles.trainTop}>
            <View style={styles.trainIcon}>
              {startQuiz.startingKey === 'mistakes' ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <AppIcon
                  name="repeat-questions"
                  fallback="refresh"
                  size={54}
                  glyphSize={20}
                  color={wrongQuestions.count > 0 ? colors.danger : colors.textMuted}
                />
              )}
            </View>

            <View style={styles.trainText}>
              <Text variant="bodyStrong" style={styles.trainTitle}>
                Falsche Fragen wiederholen
              </Text>

              {/* Under the title: the state on the left, the way in on the
                  right. Two things that belong to the same line. */}
              <View style={styles.trainLine}>
                <Text variant="caption" color={wrongQuestions.isError ? 'danger' : 'muted'} style={styles.trainHint}>
                  {wrongQuestions.isError
                    ? getUserMessage(wrongQuestions.error)
                    : wrongQuestions.isLoading
                      ? 'Wird geladen …'
                      : wrongQuestions.count > 0
                        ? `${wrongQuestions.count} ${wrongQuestions.count === 1 ? 'Frage wartet' : 'Fragen warten'} auf einen zweiten Versuch`
                        : 'Aktuell hast du keine offenen Fehler'}
                </Text>

                {/* The card is the button; this is what says so. Not a
                    Pressable of its own – two tap targets doing the same thing
                    is one too many. */}
                {wrongQuestions.count > 0 ? (
                  /*
                    Drawn rather than filled: one flat blue with an ink outline
                    around it. No cast shadow – it sits on a card that already
                    has one – and no lit upper half either, which only split
                    the colour in two.
                  */
                  <View style={[styles.trainAction, { backgroundColor: colors.primary }]}>
                    <Text variant="label" style={styles.trainActionText}>
                      Jetzt üben
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color={colors.white} />
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </Pressable>
        {startQuiz.error ? <Text color="danger">{startQuiz.error}</Text> : null}
      </View>
      ) : null}

      {/* The questions bookmarked in the quiz – nothing lands here by itself */}
      <View style={styles.section}>
        {/* The full list is always reachable – it is where saved questions
            are managed, not just where the rest of them are. */}
        <SectionHeading
          title="Gespeichert"
          trailing={
            <Pressable
              onPress={() => router.push('/saved')}
              accessibilityRole="button"
              accessibilityLabel={`Alle ${saved.questions.length} gespeicherten Fragen anzeigen`}
              hitSlop={8}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
            >
              <Text variant="caption" color="accent">
                Mehr
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </Pressable>
          }
        />
        {/* Ohne Karte darum: die Zeilen sind durch die Trennlinien schon
            voneinander abgesetzt, und der Kasten hat die Liste nur schmaler
            gemacht. */}
        <View style={styles.savedList}>
          {saved.isLoading ? (
            <View style={styles.skeletons}>
              <Skeleton height={32} borderRadius={8} />
              <Skeleton height={32} borderRadius={8} />
            </View>
          ) : saved.isError ? (
            <ErrorState compact message={getUserMessage(saved.error)} onRetry={() => void saved.refetch()} />
          ) : saved.questions.length === 0 ? (
            <EmptyState
              compact
              icon="bookmark-outline"
              title="Noch nichts gespeichert"
              message="Tippe im Quiz auf „Speichern“, um eine Frage hier abzulegen."
            />
          ) : (
            saved.questions.slice(0, SAVED_PREVIEW).map((question, i) => (
              <View key={question.id}>
                {i > 0 && <View style={styles.divider} />}
                <SavedQuestionRow
                  question={question}
                  removing={toggleSaved.isPending}
                  onPress={() => replayQuestions([question], question.categoryName, question.categoryId)}
                  onRemove={() => toggleSaved.mutate({ questionId: question.id, saved: false })}
                />
              </View>
            ))
          )}
        </View>
      </View>

      <CategoryDetailDialog
        visible={detail.open}
        category={detailCategory}
        categories={stats.allCategories}
        onSelect={openDetail}
        onOpenQuestions={setQuestionFilter}
        onStartQuiz={startCategoryQuiz}
        starting={startQuiz.starting}
        onClose={() => setDetail({ open: false, categoryId: null })}
      />

      <QuestionListDialog
        visible={questionFilter !== null}
        categoryId={detailCategory?.id ?? null}
        categoryName={detailCategory?.label ?? ''}
        filter={questionFilter ?? 'all'}
        starting={startQuiz.starting}
        onReplay={replayQuestions}
        onClose={() => setQuestionFilter(null)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  section: { gap: spacing.md, marginBottom: spacing.xl },
  // Padding, not margin: a horizontal ScrollView drops the last child's margin.
  topics: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.md, paddingVertical: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkPressed: { opacity: 0.6 },
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  savedList: { paddingVertical: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border },
  skeletons: { gap: spacing.md, paddingVertical: spacing.md },
  /*
    Ohne Feld darum. Was die Zeile trägt, ist das Symbol links und der blaue
    Knopf rechts – der rote Rahmen hat nur eine dritte Farbe hinzugefügt und
    den Block höher gemacht, als er sein muss.
  */
  trainCard: { paddingVertical: spacing.xs },
  trainPressed: { opacity: 0.7 },
  trainTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trainLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trainHint: { flex: 1 },
  // Beside the description rather than under it: the card was a third taller
  // for a pill that fits on the line the text leaves free.
  trainAction: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: INK,
    overflow: 'hidden',
  },
  trainActionText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.2 },
  // No plate behind it – the symbol brings its own shape, and a red square
  // around it only boxed it in.
  trainIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trainText: { flex: 1, gap: spacing.xs },
  trainTitle: { fontSize: 15, color: colors.textPrimary },
}));
