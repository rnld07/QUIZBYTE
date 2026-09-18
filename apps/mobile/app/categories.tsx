import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { accuracyTone, computeAccuracy } from '@quizbyte/shared';
import type { CategoryProgressRow, QuizQuestion } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { CategoryDetailDialog } from '@/components/progress/CategoryDetailDialog';
import { QuestionListDialog } from '@/components/progress/QuestionListDialog';
import { EmptyState, ErrorState, IconButton, Screen, SectionHeading, Skeleton, Text } from '@/components/ui';
import { categoryImage } from '@/content/categoryImages';
import { useStats } from '@/features/progress/useStats';
import { useCategories } from '@/features/quiz/useCategories';
import { useStartQuiz } from '@/features/quiz/useStartQuiz';
import type { QuestionOutcomeFilter } from '@/services/api/questionsApi';
import { getUserMessage } from '@/services/errors';
import { makeStyles, PLACE_COLORS, radius, spacing, useAccuracyColors, useThemeColors } from '@/theme';

/**
 * Every category, with how you are doing in each.
 *
 * A page of its own rather than a sheet over the tab: this is a list you read
 * through and come back to, and a dialog that fills the screen is a page
 * pretending not to be one – it cannot be scrolled to the top, cannot be
 * swiped away, and loses your place the moment it closes.
 *
 * Laid out on the artwork, like the home screen: the picture is how a topic is
 * recognised everywhere else in the app, and this is the screen where you look
 * for one in particular.
 */
export default function CategoriesScreen() {
  const styles = useStyles();
  const router = useRouter();
  const stats = useStats();
  const categories = useCategories();
  const startQuiz = useStartQuiz();

  // Tracked by id, so a refetch in the background keeps the sheet current.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<QuestionOutcomeFilter | null>(null);
  const detail = stats.allCategories.find((entry) => entry.id === detailId) ?? null;

  const played = stats.allCategories.filter((entry) => entry.played);
  const answered = played.reduce((sum, entry) => sum + entry.attempts, 0);
  const correct = played.reduce((sum, entry) => sum + entry.correct, 0);
  const accuracy = computeAccuracy(correct, answered);
  const accuracyColors = useAccuracyColors();

  const replayQuestions = (questions: QuizQuestion[], label?: string, categoryId?: string | null) => {
    setQuestionFilter(null);
    setDetailId(null);
    void startQuiz.start({
      type: 'replay',
      questions,
      label: label ?? detail?.label ?? 'Wiederholung',
      categoryId: categoryId ?? detail?.id ?? null,
    });
  };

  const startCategoryQuiz = (row: CategoryProgressRow) => {
    const category = categories.data?.find((entry) => entry.id === row.id);
    if (!category) return;
    setQuestionFilter(null);
    setDetailId(null);
    void startQuiz.start({ type: 'category', category });
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline">Kategorien</Text>
      </View>

      {/* What the list adds up to, before the list itself. */}
      {played.length > 0 ? (
        <View style={styles.summary}>
          <Summary value={String(played.length)} label={played.length === 1 ? 'Kategorie gespielt' : 'Kategorien gespielt'} />
          <View style={styles.summaryLine} />
          <Summary value={String(answered)} label="Fragen beantwortet" />
          <View style={styles.summaryLine} />
          <Summary value={`${accuracy} %`} label="richtig" tone={accuracyColors[accuracyTone(accuracy)]} />
        </View>
      ) : null}

      <View style={styles.headingBox}>
        <SectionHeading title="Alle Themen" />
      </View>

      {stats.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={86} borderRadius={radius.xl} />
          <Skeleton height={86} borderRadius={radius.xl} />
          <Skeleton height={86} borderRadius={radius.xl} />
        </View>
      ) : stats.isError ? (
        <ErrorState message={getUserMessage(stats.error)} onRetry={() => void stats.refetch()} />
      ) : stats.allCategories.length === 0 ? (
        <EmptyState icon="grid-outline" title="Noch keine Kategorien" message="Sobald Themen angelegt sind, findest du sie hier." />
      ) : (
        <View style={styles.list}>
          {stats.allCategories.map((entry, index) => (
            <CategoryRow key={entry.id} entry={entry} rank={index + 1} onPress={() => setDetailId(entry.id)} />
          ))}
        </View>
      )}

      {startQuiz.error ? <Text color="danger">{startQuiz.error}</Text> : null}

      {/* The drill-down stays a sheet: it is opened from a row, read, and shut
          again – there is nothing to come back to. */}
      {/* Bleibt offen, während die Fragenliste darüber liegt: beide fahren
          von unten herein, und eines, das im selben Moment verschwindet,
          in dem das andere kommt, wäre ein Sprung statt eines Übergangs. */}
      <CategoryDetailDialog
        visible={detail !== null}
        category={detail}
        categories={stats.allCategories}
        onSelect={(next) => setDetailId(next?.id ?? null)}
        onOpenQuestions={setQuestionFilter}
        onStartQuiz={startCategoryQuiz}
        starting={startQuiz.starting}
        onClose={() => setDetailId(null)}
      />

      <QuestionListDialog
        visible={questionFilter !== null}
        categoryId={detail?.id ?? null}
        categoryName={detail?.label ?? ''}
        filter={questionFilter ?? 'all'}
        starting={startQuiz.starting}
        onReplay={replayQuestions}
        onClose={() => setQuestionFilter(null)}
      />
    </Screen>
  );
}

/** One figure of the summary. A tone colours it; without one it stays plain. */
function Summary({ value, label, tone }: { value: string; label: string; tone?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.summaryItem} accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text variant="label" color="muted" numberOfLines={2} style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

/** One category: its picture, its place, its score. */
function CategoryRow({ entry, rank, onPress }: { entry: CategoryProgressRow; rank: number; onPress: () => void }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColors = useAccuracyColors();
  const tone = entry.played ? accuracyColors[accuracyTone(entry.accuracy)] : colors.textMuted;
  const place = entry.played ? PLACE_COLORS[rank] : undefined;
  const image = categoryImage(entry.slug);
  const accent = entry.accentColor ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        entry.played
          ? `Platz ${rank}, ${entry.label}: ${entry.correct} von ${entry.attempts} Fragen richtig, ${entry.accuracy} Prozent`
          : `${entry.label}: noch nicht gespielt`
      }
      accessibilityHint="Zeigt die Details der Kategorie"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* The picture as a square plate on the left rather than as a backdrop:
          at this height a full-bleed image leaves the numbers nowhere quiet to
          sit, and the plate reads as "this topic" just as well. */}
      <View style={styles.plate}>
        {image ? (
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        ) : (
          <LinearGradient colors={[`${accent}88`, `${accent}33`]} style={StyleSheet.absoluteFill} />
        )}
        {!entry.played ? <View style={styles.plateDim} /> : null}

        {/* The place, over the picture at its corner. Every rank, not just the
            medals: a list you read to find one topic needs to be countable all
            the way down. */}
        {entry.played ? (
          <View style={[styles.place, place ? { borderColor: place } : null]}>
            <Text style={[styles.placeNumber, place ? { color: place } : null]}>{rank}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.rowLabel}>
          {entry.label}
        </Text>

        <View style={[styles.track, { backgroundColor: `${accent}2E` }]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.min(100, Math.max(0, entry.played ? entry.accuracy : 0))}%`, backgroundColor: tone },
            ]}
          />
        </View>

        <Text variant="label" color="muted" numberOfLines={1}>
          {entry.played ? `${entry.correct}/${entry.attempts} richtig` : 'Noch nicht gespielt'}
        </Text>
      </View>

      <View style={styles.scoreBox}>
        <Text style={[styles.percent, { color: tone }]}>{entry.played ? entry.accuracy : '–'}</Text>
        {entry.played ? <Text style={[styles.percentSign, { color: tone }]}>%</Text> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },

  /*
    Ohne Kasten: die drei Zahlen stehen bereits durch die Trennstriche
    auseinander, und ein Rahmen darum machte aus einer Kopfzeile eine Karte.
  */
  summary: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs },
  summaryValue: { fontSize: 20, fontWeight: '800', lineHeight: 24, color: colors.textPrimary },
  summaryLabel: { textAlign: 'center' },
  summaryLine: { width: 1, backgroundColor: colors.border },

  headingBox: { marginBottom: spacing.md },
  list: { gap: spacing.sm },

  /*
    Ohne Feld drumherum: das Bild links bringt seine eigene Kante mit, und ein
    Kästchen um jede Zeile machte aus einer Liste, die man von oben nach unten
    liest, einen Stapel einzelner Karten.
  */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  pressed: { opacity: 0.7 },

  plate: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfacePressed,
    flexShrink: 0,
  },
  plateDim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3, 7, 13, 0.5)' },

  rowBody: { flex: 1, gap: 5 },
  rowLabel: { fontSize: 15, color: colors.textPrimary },
  place: {
    position: 'absolute',
    top: 3,
    left: 3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    // Dark under the figure, so it holds up over any artwork.
    backgroundColor: 'rgba(3, 7, 13, 0.72)',
  },
  placeNumber: { fontSize: 11, fontWeight: '800', lineHeight: 14, color: '#FFFFFF' },

  track: { height: 5, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },

  scoreBox: { flexDirection: 'row', alignItems: 'baseline', gap: 1, flexShrink: 0 },
  percent: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  percentSign: { fontSize: 11, fontWeight: '800' },
}));
