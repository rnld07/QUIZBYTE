import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Difficulty, QuizQuestion } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { SavedFilterSheet } from '@/components/progress/SavedFilterSheet';
import type { SavedFilterKind } from '@/components/progress/SavedFilterSheet';
import { SavedQuestionRow } from '@/components/progress/SavedQuestionRow';
import { AppIcon, EmptyState, ErrorState, IconButton, Screen, Skeleton, Text } from '@/components/ui';
import { sectionIcon } from '@/content/sectionIcons';
import type { SectionIconKey } from '@/content/sectionIcons';
import { useSavedQuestions, useToggleSavedQuestion } from '@/features/progress/useSavedQuestions';
import { useStartQuiz } from '@/features/quiz/useStartQuiz';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

/**
 * Alle gespeicherten Fragen.
 *
 * Eine Seite statt eines Fensters: das hier ist eine Liste, die man durchgeht,
 * filtert und zu der man zurückkommt. Ein Dialog, der den Bildschirm füllt, ist
 * eine Seite, die so tut, als wäre sie keine – er lässt sich nicht nach oben
 * scrollen, nicht wegwischen, und beim Schließen ist die Stelle weg, an der man
 * gerade war.
 */
export default function SavedQuestionsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const saved = useSavedQuestions();
  const toggleSaved = useToggleSavedQuestion();
  const startQuiz = useStartQuiz();

  // Leer heißt "alle" – dieselbe Regel wie bei der Schwierigkeitseinstellung.
  const [levelFilter, setLevelFilter] = useState<Difficulty[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<SavedFilterKind>(null);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  const questions = saved.questions.filter(
    (question) =>
      (categoryFilter.length === 0 || categoryFilter.includes(question.categoryId)) &&
      (levelFilter.length === 0 || levelFilter.includes(question.difficulty)),
  );

  const replay = (question: QuizQuestion) => {
    void startQuiz.start({
      type: 'replay',
      questions: [question],
      label: question.categoryName,
      categoryId: question.categoryId,
    });
  };

  return (
    <Screen backdrop={<AmbientBackground />} scrollToTopKey="saved">
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <View style={styles.titleText}>
          <Text variant="headline" style={styles.title}>
            Gespeichert
          </Text>
          <Text variant="caption" color="muted">
            {saved.questions.length === 1 ? '1 Frage' : `${saved.questions.length} Fragen`}
            {questions.length !== saved.questions.length ? ` · ${questions.length} gefiltert` : ''}
          </Text>
        </View>
      </View>

      {/*
        Zwei Knöpfe statt einer langen Chip-Reihe: mit mehreren Kategorien
        scrollte die aus dem Bild. Jeder öffnet seine eigene Auswahl, und beide
        lassen sich beliebig kombinieren.

        Auch dann zu sehen, wenn nichts gespeichert ist: die Knöpfe sind das,
        was sagt, dass sich die Liste überhaupt einschränken lässt – und eine
        Auswahl, die nichts übrig lässt, darf den Weg zurück nicht verlieren.
      */}
      {saved.isError ? null : (
        <View style={styles.filterBar}>
          <FilterButton
            icon="speedometer-outline"
            art="difficulty"
            label="Schwierigkeit"
            count={levelFilter.length}
            open={openFilter === 'level'}
            onPress={() => setOpenFilter('level')}
          />
          <FilterButton
            icon="grid-outline"
            art="categories"
            label="Kategorien"
            count={categoryFilter.length}
            open={openFilter === 'category'}
            onPress={() => setOpenFilter('category')}
          />
        </View>
      )}

      {startQuiz.error ? <Text color="danger">{startQuiz.error}</Text> : null}

      {saved.isLoading ? (
        <View style={styles.skeletons}>
          <Skeleton height={56} borderRadius={14} />
          <Skeleton height={56} borderRadius={14} />
          <Skeleton height={56} borderRadius={14} />
        </View>
      ) : saved.isError ? (
        <ErrorState message={getUserMessage(saved.error)} onRetry={() => void saved.refetch()} />
      ) : saved.questions.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Noch nichts gespeichert"
          message="Tippe im Quiz auf „Speichern“, um eine Frage hier abzulegen."
        />
      ) : questions.length === 0 ? (
        <EmptyState
          icon="funnel-outline"
          title="Nichts in dieser Auswahl"
          message="Zu diesen Filtern hast du noch keine Frage gespeichert."
          actionLabel="Filter zurücksetzen"
          onAction={() => {
            setLevelFilter([]);
            setCategoryFilter([]);
          }}
        />
      ) : (
        <View style={styles.list}>
          {questions.map((question, index) => (
            <View key={question.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <SavedQuestionRow
                question={question}
                removing={toggleSaved.isPending}
                onPress={() => replay(question)}
                onRemove={() => toggleSaved.mutate({ questionId: question.id, saved: false })}
              />
            </View>
          ))}
        </View>
      )}

      <SavedFilterSheet
        open={openFilter}
        levels={levelFilter}
        categories={categoryFilter}
        onToggleLevel={(value) => setLevelFilter(toggle(levelFilter, value))}
        onToggleCategory={(value) => setCategoryFilter(toggle(categoryFilter, value))}
        onClearLevels={() => setLevelFilter([])}
        onClearCategories={() => setCategoryFilter([])}
        onClose={() => setOpenFilter(null)}
      />
    </Screen>
  );
}

interface FilterButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Schlüssel des eigenen Symbols für diesen Filter, falls eins hinterlegt ist. */
  art: SectionIconKey;
  label: string;
  /** Wie viele Werte gewählt sind; 0 heißt "alle". */
  count: number;
  open: boolean;
  onPress: () => void;
}

/** Öffnet eine der beiden Auswahlen und zeigt, wie viele Werte aktiv sind. */
function FilterButton({ icon, art, label, count, open, onPress }: FilterButtonProps) {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={count === 0 ? `${label}: alle` : `${label}: ${count} ausgewählt`}
      style={({ pressed }) => [styles.filterButton, (open || count > 0) && styles.filterButtonOn, pressed && styles.pressed]}
    >
      <AppIcon
        source={sectionIcon(art)}
        fallback={icon}
        size={22}
        glyphSize={16}
        color={open || count > 0 ? colors.primary : colors.textSecondary}
      />
      <Text variant="label" numberOfLines={1} style={styles.filterButtonText}>
        {label}
      </Text>
      {count > 0 ? (
        <Text variant="label" style={[styles.filterCount, styles.filterCountText]}>
          {count}
        </Text>
      ) : (
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  titleText: { flex: 1, gap: 1 },
  title: { letterSpacing: -0.3 },

  filterBar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfacePressed,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonOn: { borderColor: colors.primary },
  filterButtonText: { fontSize: 12, color: colors.textSecondary },
  filterCount: {
    minWidth: 17,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    textAlign: 'center',
    overflow: 'hidden',
  },
  filterCountText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  pressed: { opacity: 0.7 },

  list: { gap: 0 },
  divider: { height: 1, backgroundColor: colors.border },
  skeletons: { gap: spacing.sm },
}));
