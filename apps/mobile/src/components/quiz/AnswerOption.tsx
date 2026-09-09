import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AnswerKey } from '@quizbyte/shared';

import { colors, radius, spacing, touchTarget } from '@/theme';

import { Text } from '../ui';

export type AnswerOptionState = 'default' | 'correct' | 'wrong' | 'muted';

interface AnswerOptionProps {
  answerKey: AnswerKey;
  text: string;
  state: AnswerOptionState;
  disabled: boolean;
  onPress: (key: AnswerKey) => void;
}

/**
 * One answer. State is communicated by colour AND icon so it is not colour-only.
 */
export function AnswerOption({ answerKey, text, state, disabled, onPress }: AnswerOptionProps) {
  const icon = state === 'correct' ? 'checkmark-circle' : state === 'wrong' ? 'close-circle' : null;
  const iconColor = state === 'correct' ? colors.success : colors.danger;
  const stateLabel = state === 'correct' ? 'richtig' : state === 'wrong' ? 'falsch' : undefined;

  return (
    <Pressable
      onPress={() => onPress(answerKey)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Antwort ${answerKey}: ${text}${stateLabel ? `, ${stateLabel}` : ''}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, styles[state], pressed && !disabled && styles.pressed]}
    >
      <View style={[styles.keyBadge, state === 'correct' && styles.keyCorrect, state === 'wrong' && styles.keyWrong]}>
        <Text variant="label" color={state === 'default' ? 'secondary' : 'primary'}>
          {answerKey}
        </Text>
      </View>
      <Text variant="body" color={state === 'muted' ? 'secondary' : 'primary'} style={styles.text}>
        {text}
      </Text>
      {icon ? <Ionicons name={icon} size={22} color={iconColor} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  default: {},
  muted: { opacity: 0.55 },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  pressed: { backgroundColor: colors.surfacePressed },
  keyBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCorrect: { backgroundColor: colors.success },
  keyWrong: { backgroundColor: colors.danger },
  text: { flex: 1 },
});
