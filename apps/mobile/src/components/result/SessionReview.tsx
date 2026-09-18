import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ANSWER_KEYS, answerOrder } from '@quizbyte/shared';
import type { AttemptResult, QuizQuestion } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Text } from '../ui';

interface SessionReviewProps {
  sessionId: string;
  questions: readonly QuizQuestion[];
  attempts: readonly AttemptResult[];
}

/**
 * The round to look back over: every question that was actually answered, what
 * was picked, what was right, and why.
 *
 * Collapsed by default – the result is the headline, this is for afterwards.
 * Unanswered questions are left out entirely: Blitz and Survival draw far more
 * than anyone plays, and listing the rest would be a spoiler, not a review.
 */
export function SessionReview({ sessionId, questions, attempts }: SessionReviewProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const byId = new Map(questions.map((question) => [question.id, question]));
  // In the order they were played, which is the order the attempts came in.
  const played = attempts
    .map((attempt) => ({ attempt, question: byId.get(attempt.questionId) }))
    .filter((entry): entry is { attempt: AttemptResult; question: QuizQuestion } => entry.question !== undefined);

  if (played.length === 0) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Fragen dieser Runde ansehen"
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <Ionicons name="list-outline" size={17} color={colors.textPrimary} />
        <Text variant="bodyStrong" style={styles.headText}>
          Fragen ansehen
        </Text>
        <Text variant="label" color="muted">
          {played.length}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </Pressable>

      {open
        ? played.map(({ attempt, question }, index) => (
            <ReviewRow
              key={attempt.questionId}
              number={index + 1}
              question={question}
              attempt={attempt}
              sessionId={sessionId}
              expanded={expanded === attempt.questionId}
              onToggle={() => setExpanded((current) => (current === attempt.questionId ? null : attempt.questionId))}
            />
          ))
        : null}
    </View>
  );
}

interface ReviewRowProps {
  number: number;
  question: QuizQuestion;
  attempt: AttemptResult;
  sessionId: string;
  expanded: boolean;
  onToggle: () => void;
}

function ReviewRow({ number, question, attempt, sessionId, expanded, onToggle }: ReviewRowProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const tone = attempt.isCorrect ? colors.success : colors.danger;

  // The same shuffle the round used, so the letters match what was on screen.
  const order = answerOrder(question.id, sessionId);
  const letterFor = (key: string) => ANSWER_KEYS[order.indexOf(key as (typeof ANSWER_KEYS)[number])] ?? key;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Frage ${number}: ${attempt.isCorrect ? 'richtig' : 'falsch'}`}
        style={({ pressed }) => [styles.rowHead, pressed && styles.pressed]}
      >
        <View style={[styles.marker, { backgroundColor: `${tone}22`, borderColor: tone }]}>
          <Ionicons name={attempt.isCorrect ? 'checkmark' : 'close'} size={13} color={tone} />
        </View>

        <View style={styles.rowText}>
          <Text variant="bodyStrong" numberOfLines={expanded ? undefined : 2} style={styles.question}>
            {question.questionText}
          </Text>
          <Text variant="label" color="muted" numberOfLines={1}>
            {question.categoryName}
            {attempt.xpEarned > 0 ? ` · +${attempt.xpEarned} XP` : ''}
          </Text>
        </View>

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} />
      </Pressable>

      {expanded ? (
        <View style={styles.detail}>
          {/* Shown in the order they were on screen, with the same letters. */}
          {order.map((key) => {
            const correct = key === question.correctAnswer;
            const picked = key === attempt.selectedAnswer;
            return (
              <View
                key={key}
                style={[
                  styles.option,
                  correct && { borderColor: colors.success, backgroundColor: `${colors.success}14` },
                  picked && !correct && { borderColor: colors.danger, backgroundColor: `${colors.danger}14` },
                ]}
              >
                <Text variant="label" style={styles.optionLetter}>
                  {letterFor(key)}
                </Text>
                <Text variant="caption" style={styles.optionText}>
                  {question.answers[key]}
                </Text>
                {picked ? (
                  <Text variant="label" color={correct ? 'success' : 'danger'}>
                    deine Wahl
                  </Text>
                ) : null}
              </View>
            );
          })}

          {question.explanation ? (
            <Text variant="caption" color="secondary" style={styles.explanation}>
              {question.explanation}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { gap: 0, marginBottom: spacing.lg },
  // No pill around it: it opens a list below itself rather than leading
  // somewhere, and a framed button promised the second thing.
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  headText: { flex: 1, color: colors.textPrimary },
  pressed: { opacity: 0.7 },

  /*
    Ohne Karte je Frage: der farbige Punkt links sagt schon, wie sie ausging,
    und ein Kasten um jede Zeile machte aus dem Rückblick einen Stapel Karten,
    durch den man sich blättert.
  */
  row: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, gap: spacing.sm },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  marker: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowText: { flex: 1, gap: 1 },
  question: { fontSize: 14, lineHeight: 19, color: colors.textPrimary },

  detail: { gap: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfacePressed,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionLetter: { fontSize: 11, width: 12, color: colors.textMuted },
  optionText: { flex: 1, color: colors.textPrimary },
  explanation: { marginTop: spacing.xs, lineHeight: 18 },
}));
