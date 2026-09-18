import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import type { AnswerKey } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Text } from '../ui';

export type AnswerOptionState = 'default' | 'correct' | 'wrong' | 'muted';

interface AnswerOptionProps {
  /** The stored key – what gets submitted, wherever the option is shown. */
  answerKey: AnswerKey;
  /** Letter on the badge; follows the position on screen. Defaults to the key. */
  label?: string;
  text: string;
  state: AnswerOptionState;
  disabled: boolean;
  onPress: (key: AnswerKey) => void;
}

/**
 * One answer option. Large touch target (80px+), circular letter badge,
 * correct state: green gradient border + checkmark.
 */
export function AnswerOption({ answerKey, label, text, state, disabled, onPress }: AnswerOptionProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const badge = label ?? answerKey;
  const isCorrect = state === 'correct';
  const isWrong = state === 'wrong';
  const isMuted = state === 'muted';

  const icon = isCorrect ? 'checkmark-circle' : isWrong ? 'close-circle' : null;
  const iconColor = isCorrect ? colors.success : colors.danger;
  const stateLabel = isCorrect ? 'richtig' : isWrong ? 'falsch' : undefined;

  return (
    <Pressable
      onPress={() => onPress(answerKey)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Antwort ${badge}: ${text}${stateLabel ? `, ${stateLabel}` : ''}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        isCorrect && styles.correct,
        isWrong && styles.wrong,
        isMuted && styles.muted,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {/* Circular letter badge */}
      <View
        style={[
          styles.keyBadge,
          isCorrect && styles.keyBadgeCorrect,
          isWrong && styles.keyBadgeWrong,
        ]}
      >
        <Text
          variant="label"
          style={[
            styles.keyText,
            (isCorrect || isWrong) && styles.keyTextActive,
          ]}
        >
          {badge}
        </Text>
      </View>

      {/* Answer text */}
      <Text
        variant="body"
        style={[styles.text, isMuted && styles.textMuted]}
        numberOfLines={3}
      >
        {text}
      </Text>

      {/* Correct / wrong icon */}
      {icon ? <Ionicons name={icon} size={22} color={iconColor} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  base: {
    // Sits on the tinted quiz backdrop – an opaque, lifted surface keeps the
    // option clearly separated from it.
    ...shadows.tile,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.quizSurface,
  },
  correct: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  wrong: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  muted: { opacity: 0.45 },
  pressed: { backgroundColor: colors.surfacePressed, transform: [{ scale: 0.985 }] },

  keyBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  keyBadgeCorrect: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  keyBadgeWrong: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  keyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  keyTextActive: { color: colors.white },
  text: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  textMuted: { color: colors.textMuted },
}));
