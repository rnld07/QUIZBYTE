import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useDeleteAccount } from '@/features/auth/useDeleteAccount';
import { getUserMessage } from '@/services/errors';
import { FixedTheme, makeStyles, radius, spacing, typography, useGradients, useThemeColors } from '@/theme';

import { Button, IconButton, Text } from '../ui';

/** Typed to arm the button – a slip of the thumb must not cost an account. */
const CONFIRM_WORD = 'LÖSCHEN';

interface DeleteAccountDialogProps {
  visible: boolean;
  email: string;
  onClose: () => void;
}

/**
 * The last step before an account is gone.
 *
 * Three gates, none of them decoration: the page says what disappears, the word
 * has to be typed, and the password has to be given again. Deleting is the one
 * thing in the app that cannot be undone by tapping again, and the session by
 * itself is no proof of who is holding the phone.
 */
function DeleteAccountDialogBody({ visible, email, onClose }: DeleteAccountDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  const remove = useDeleteAccount();
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');

  if (!visible) return null;

  const armed = confirm.trim().toUpperCase() === CONFIRM_WORD && password.length > 0;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.fillClip}>
            <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={gradients.edge} style={styles.edge} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text variant="label" style={styles.eyebrow}>
                ENDGÜLTIG
              </Text>
              <Text variant="headline" style={styles.title}>
                Konto löschen
              </Text>
            </View>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={onClose} />
          </View>

          <View style={styles.body}>
            <Text variant="caption" color="secondary">
              Damit verschwinden dein Profil, dein Level und deine XP, alle gespielten Runden und Antworten, deine
              Freundschaften, Chats und Duelle sowie deine gespeicherten Fragen. Das lässt sich nicht rückgängig machen
              und wir können nichts davon wiederherstellen.
            </Text>

            <Text variant="label" style={styles.label}>
              TIPPE {CONFIRM_WORD}
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={CONFIRM_WORD}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel={`Tippe ${CONFIRM_WORD}`}
            />

            <Text variant="label" style={styles.label}>
              PASSWORT
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              placeholder="Dein Passwort"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Passwort"
            />

            {remove.isError ? <Text color="danger">{getUserMessage(remove.error)}</Text> : null}

            <Button
              title="Konto endgültig löschen"
              variant="danger"
              disabled={!armed}
              loading={remove.isPending}
              onPress={() => remove.mutate({ email, password })}
              style={styles.action}
            />
            <Button title="Abbrechen" variant="secondary" onPress={onClose} disabled={remove.isPending} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 13, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 380,
    paddingBottom: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xxl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.danger },
  title: { letterSpacing: -0.2, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  label: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted, marginTop: spacing.sm },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  action: { marginTop: spacing.md },
}));

/** Dark whatever the theme, like every dialog in the app. */
export function DeleteAccountDialog(props: DeleteAccountDialogProps) {
  return (
    <FixedTheme scheme="dark">
      <DeleteAccountDialogBody {...props} />
    </FixedTheme>
  );
}
