import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

import type { Difficulty, QuizQuestion } from '@quizbyte/shared';

import { useCategoryQuestions } from '@/features/progress/useCategoryQuestions';
import type { QuestionOutcomeFilter } from '@/services/api/questionsApi';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';
import type { ThemeColors } from '@/theme';

import { BottomSheet, EmptyState, ErrorState, Skeleton, Text } from '../ui';

const FILTER_TITLES: Record<QuestionOutcomeFilter, string> = {
  all: 'Alle Fragen',
  correct: 'Richtig beantwortet',
  wrong: 'Falsch beantwortet',
};

const FILTER_COLOR_KEYS: Record<QuestionOutcomeFilter, keyof ThemeColors> = {
  all: 'primary',
  correct: 'success',
  wrong: 'danger',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
};

interface QuestionListDialogProps {
  visible: boolean;
  categoryId: string | null;
  categoryName: string;
  filter: QuestionOutcomeFilter;
  /** Starts a replay session. Owned by the screen so it survives this unmount. */
  onReplay: (questions: QuizQuestion[]) => void;
  starting?: boolean;
  onClose: () => void;
}

/**
 * Die Fragen hinter einer der Kategoriezahlen.
 *
 * Kommt von unten wie die Kategorie, aus der sie geöffnet wird – zwei Fenster
 * hintereinander, von denen das eine hereinfährt und das andere aufblendet,
 * lesen sich als zwei verschiedene Sorten von Fenster.
 *
 * Ein Tipp auf eine Frage wiederholt genau die eine; der Knopf unten die ganze
 * Liste.
 */
export function QuestionListDialog({
  visible,
  categoryId,
  categoryName,
  filter,
  onReplay,
  starting,
  onClose,
}: QuestionListDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const list = useCategoryQuestions(visible ? categoryId : null, filter);
  const accent = colors[FILTER_COLOR_KEYS[filter]];

  const replay = (questions: QuizQuestion[]) => {
    if (questions.length === 0) return;
    onReplay(questions);
  };

  return (
    <BottomSheet visible={visible} title={FILTER_TITLES[filter]} eyebrow={categoryName.toUpperCase()} height={0.8} onClose={onClose}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {list.isLoading ? (
          <View style={styles.skeletons}>
            <Skeleton height={58} borderRadius={12} />
            <Skeleton height={58} borderRadius={12} />
            <Skeleton height={58} borderRadius={12} />
          </View>
        ) : list.isError ? (
          <ErrorState compact message={getUserMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : list.questions.length === 0 ? (
          <EmptyState compact icon="document-text-outline" title="Keine Fragen" message="Hier ist noch nichts zu sehen." />
        ) : (
          list.questions.map((question, index) => (
            <View key={question.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                onPress={() => replay([question])}
                accessibilityRole="button"
                accessibilityLabel={question.questionText}
                accessibilityHint="Diese Frage noch einmal beantworten"
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.question} numberOfLines={3}>
                    {question.questionText}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.difficultyPill, { borderColor: `${accent}55` }]}>
                      <Text variant="label" style={styles.difficultyText}>
                        {DIFFICULTY_LABELS[question.difficulty]}
                      </Text>
                    </View>
                    {question.subcategory ? (
                      <Text variant="caption" color="muted" numberOfLines={1} style={styles.subcategory}>
                        {question.subcategory}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="refresh" size={17} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {list.questions.length > 1 ? (
        <Pressable
          onPress={() => replay(list.questions)}
          disabled={starting}
          accessibilityRole="button"
          accessibilityLabel={`Alle ${list.questions.length} Fragen noch einmal beantworten`}
          style={({ pressed }) => [styles.action, { backgroundColor: accent }, pressed && styles.actionPressed]}
        >
          <Ionicons name="play" size={15} color={colors.white} />
          <Text variant="bodyStrong" style={[styles.actionText, { color: colors.white }]}>
            Alle {list.questions.length} wiederholen
          </Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  scroll: { flex: 1 },
  body: { paddingBottom: spacing.md },
  skeletons: { gap: spacing.sm, paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },
  // Ohne Kasten je Zeile: die Trennlinien setzen sie schon auseinander, und ein
  // Rahmen um jede Frage machte aus der Liste einen Stapel Karten.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  rowPressed: { opacity: 0.7 },
  rowText: { flex: 1, gap: spacing.xs },
  question: { fontSize: 14, lineHeight: 19, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  difficultyPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  difficultyText: { fontSize: 10, color: colors.textSecondary },
  subcategory: { flex: 1 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.full,
  },
  actionPressed: { opacity: 0.7 },
  actionText: { fontSize: 14, letterSpacing: 0.2 },
}));
