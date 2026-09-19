import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { ANSWER_KEYS, answerOrder } from '@quizbyte/shared';
import type { AnswerKey, QuizQuestion } from '@quizbyte/shared';

import { AnswerOption } from '@/components/quiz/AnswerOption';
import type { AnswerOptionState } from '@/components/quiz/AnswerOption';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { QuizAmbientBackground } from '@/components/quiz/QuizAmbientBackground';
import { statIcon } from '@/content/statIcons';
import type { SharedAnswer } from '@/services/api/friendsApi';
import { layout, makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { AppIcon, Text } from '../ui';

interface SharedQuestionBubbleProps {
  /** Null while the text is still being fetched. */
  question: QuizQuestion | null;
  /** True when I sent it – then the answer below is my friend's. */
  mine: boolean;
  answer: SharedAnswer | null;
  friendName: string;
  /** Opens the question in the full view. */
  onOpen: () => void;
}

/**
 * How much room a question has on the real screen.
 *
 * The preview has to be laid out at *that* width and then shrunk, not laid out
 * at its own width: text wrapping is what gives a question its shape, and a
 * layout that is 480 points wide before scaling wraps where the real one does
 * not – which is why it came out wide and flat.
 */
function questionScreenWidth(windowWidth: number): number {
  return windowWidth - 2 * layout.screenPaddingHorizontal;
}

/**
 * A question in the chat: the question screen in miniature.
 *
 * Over it a scrim and one button. The preview is there to be recognised, not
 * to be used – answering happens in the real view, where the question has the
 * whole screen.
 */
export function SharedQuestionBubble({ question, mine, answer, friendName, onOpen }: SharedQuestionBubbleProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  // The scaled content keeps its full-size layout, so the box around it has to
  // be told how tall the result actually is – and how wide it itself ended up,
  // to know by how much to shrink.
  const [content, setContent] = useState<{ height: number } | null>(null);
  const [boxWidth, setBoxWidth] = useState<number | null>(null);

  if (!question) {
    return (
      <Text variant="caption" color="muted">
        Frage wird geladen …
      </Text>
    );
  }

  const keys = answerOrder(question.id);
  // The sender may see the solution; the recipient only after answering.
  const revealed = mine || answer !== null;
  const accent = question.categoryAccentColor ?? colors.primary;

  const state = (key: AnswerKey): AnswerOptionState => {
    if (!revealed) return 'default';
    if (key === question.correctAnswer) return 'correct';
    if (key === answer?.selectedAnswer) return 'wrong';
    return 'muted';
  };

  // How far the real screen has to shrink to fit this bubble.
  const fullWidth = questionScreenWidth(windowWidth);
  const scale = boxWidth === null ? null : boxWidth / fullWidth;
  const height = content && scale ? Math.round(content.height * scale) : null;

  return (
    <View style={styles.body}>
      <Pressable
        onPress={onOpen}
        onLayout={(event: LayoutChangeEvent) => setBoxWidth(event.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityLabel={`Zur Frage: ${question.questionText}`}
        style={({ pressed }) => [
          styles.preview,
          height === null ? styles.measuring : { height },
          pressed && styles.pressed,
        ]}
      >
        <QuizAmbientBackground accentColor={accent} questionId={question.id} still />

        {/* Laid out at the width a question really has, then scaled down from
            its top left corner – so the miniature wraps and spaces exactly the
            way the screen it stands for does. */}
        <View style={styles.scaler} pointerEvents="none">
          <View
            onLayout={(event: LayoutChangeEvent) => setContent({ height: event.nativeEvent.layout.height })}
            style={[styles.content, { width: fullWidth }, scale === null ? styles.hidden : { transform: [{ scale }] }]}
          >
            <QuestionCard question={question} preview />
            <View style={styles.answers}>
              {keys.map((key, position) => (
                <AnswerOption
                  key={key}
                  answerKey={key}
                  label={ANSWER_KEYS[position] ?? key}
                  text={question.answers[key]}
                  state={state(key)}
                  disabled
                  onPress={() => undefined}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Dimmed, with the one thing to do on top of it. */}
        <View style={styles.scrim} pointerEvents="none" />
        <View style={styles.callToAction} pointerEvents="none">
          <View style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text variant="bodyStrong" style={{ color: colors.white }}>
              Zur Frage
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </View>
        </View>
      </Pressable>

      {answer ? (
        <View style={styles.footer}>
          {/* Dieselben Bilder wie überall sonst für richtig und falsch. */}
          <AppIcon
            source={statIcon(answer.isCorrect ? 'correct' : 'wrong')}
            fallback={answer.isCorrect ? 'checkmark-circle' : 'close-circle'}
            size={18}
            glyphSize={15}
            color={answer.isCorrect ? colors.success : colors.danger}
          />
          {/* `flex: 1` ist das Entscheidende: ohne das nimmt der Text seine
              natürliche Breite und läuft bei einem langen Namen rechts aus der
              Blase heraus, statt umzubrechen. */}
          <Text variant="caption" style={[styles.footerText, { color: answer.isCorrect ? colors.success : colors.danger }]}>
            {mine ? `${friendName} hat ` : 'Du hast '}
            {answer.isCorrect ? 'richtig' : 'falsch'} geantwortet
          </Text>
        </View>
      ) : mine ? (
        <View style={styles.footer}>
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <Text variant="caption" color="muted">
            {friendName} hat noch nicht geantwortet
          </Text>
        </View>
      ) : (
        <View style={styles.footer}>
          <Ionicons name="alert-circle-outline" size={15} color={colors.primary} />
          <Text variant="caption" color="accent">
            Noch nicht beantwortet
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  body: { gap: spacing.sm },
  // Clips the backdrop and the overhang of the scaled content to the bubble.
  preview: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  // Before the first measurement: tall enough not to flash as a sliver, and
  // replaced on the very next frame.
  measuring: { height: 220 },
  pressed: { opacity: 0.85 },
  scaler: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Width and scale come from the caller – they depend on the screen and on
  // how much of the row this bubble got.
  content: { padding: spacing.md, gap: spacing.md, transformOrigin: 'top left' },
  // Out of sight for the one frame before the first measurement, so the
  // unscaled layout never flashes at full size.
  hidden: { opacity: 0 },
  answers: { gap: spacing.sm },
  // Dark enough to read as "not here", light enough that the question behind is
  // still recognisable – which is the whole point of a preview.
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3, 7, 13, 0.55)' },
  callToAction: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  // Eingerückt wie der Inhalt darüber: bündig am Rand stieß das Symbol
  // direkt an die Kante der Blase.
  // `alignItems: 'flex-start'`, damit das Symbol bei zwei Zeilen Text oben
  // bleibt statt in die Mitte zu rutschen.
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  footerText: { flex: 1 },
}));
