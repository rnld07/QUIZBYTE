import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import type { Difficulty, QuizQuestion } from '@quizbyte/shared';

import { makeStyles, spacing, useThemeColors } from '@/theme';

import { Text } from '../ui';
import { CategoryBadge } from './CategoryBadge';
import { DIFFICULTY_LABELS, useDifficultyColors } from './DifficultyBreakdown';

interface SavedQuestionRowProps {
  question: QuizQuestion;
  /** Replays this single question. */
  onPress: () => void;
  /** Takes the question off the saved list. */
  onRemove: () => void;
  removing?: boolean;
}

/** One bookmarked question in "Gespeichert". */
export function SavedQuestionRow({ question, onPress, onRemove, removing }: SavedQuestionRowProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const difficulty = question.difficulty as Difficulty;
  const difficultyColors = useDifficultyColors();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={question.questionText}
        accessibilityHint="Diese Frage noch einmal beantworten"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <CategoryBadge
          slug={question.categorySlug}
          icon={question.categoryIcon}
          accentColor={question.categoryAccentColor}
          size={32}
        />

        <View style={styles.texts}>
          <Text style={styles.question} numberOfLines={2}>
            {question.questionText}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.dot, { backgroundColor: difficultyColors[difficulty] }]} />
            <Text variant="caption" color="muted" numberOfLines={1}>
              {DIFFICULTY_LABELS[difficulty]} · {question.categoryName}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* The filled bookmark mirrors the icon in the quiz: tapping it unsaves. */}
      <Pressable
        onPress={onRemove}
        disabled={removing}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Aus Gespeichert entfernen"
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
      >
        <Ionicons name="bookmark" size={17} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.6 },
  texts: { flex: 1, gap: 2 },
  question: { fontSize: 14, lineHeight: 19, color: colors.textPrimary, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 999 },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}));
