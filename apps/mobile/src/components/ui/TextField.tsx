import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Text } from './Text';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  /** Small line above the field, e.g. "E-MAIL". */
  label: string;
  /** Shown under the field in red; the field's border turns red with it. */
  error?: string | null;
  /** Renders the eye button and starts hidden. */
  secure?: boolean;
  /** Explains the field when the rules are not obvious, e.g. "mindestens 8 Zeichen". */
  hint?: string;
}

/**
 * A labelled text input.
 *
 * A password field gets an eye rather than a second "repeat it" field: typing
 * the same thing twice blind is where sign-ups go wrong, and being able to look
 * catches the typo the repetition was there to catch.
 */
export function TextField({ label, error, secure, hint, ...input }: TextFieldProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <Text variant="label" color="secondary">
        {label}
      </Text>

      <View style={[styles.box, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          {...input}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel={label}
        />

        {secure ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Passwort verbergen' : 'Passwort anzeigen'}
            style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  field: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
  },
  // Fixed height rather than padding: a secure field and a plain one report
  // different line heights, and the rows would not line up.
  input: { flex: 1, height: 48, fontSize: 15, color: colors.textPrimary },
  eye: { paddingLeft: spacing.sm },
  pressed: { opacity: 0.6 },
}));
