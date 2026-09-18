import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { equippedFrame } from '@quizbyte/shared';

import { useFriends, useShareQuestionWithFriend } from '@/features/friends/useFriends';
import { getUserMessage } from '@/services/errors';
import { FixedTheme, makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { Avatar, IconButton, Text } from '../ui';

interface SendToFriendDialogProps {
  visible: boolean;
  /** The question being sent; null closes the dialog. */
  questionId: string | null;
  onClose: () => void;
}

/**
 * Picks a friend and sends them the question that is open.
 *
 * One tap per friend, no confirm step: sending a question is small and
 * reversible in the sense that nothing is lost – the row reports back instead,
 * with a tick, so several can be picked in a row.
 */
function SendToFriendDialogBody({ visible, questionId, onClose }: SendToFriendDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  const friends = useFriends();
  const share = useShareQuestionWithFriend();
  // Who already got it – so the list says what happened rather than closing
  // itself and leaving you guessing. Kept per question rather than reset when
  // the question changes: the ticks of one question must not be read as the
  // ticks of the next, and a key is simpler than an effect that clears state.
  const [sent, setSent] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (!visible || !questionId) return null;

  const alreadySent = sent[questionId] ?? [];

  const send = (friendId: string) => {
    setBusy(friendId);
    share.mutate(
      { friendId, questionId },
      {
        onSuccess: () =>
          setSent((current) => ({ ...current, [questionId]: [...(current[questionId] ?? []), friendId] })),
        onSettled: () => setBusy(null),
      },
    );
  };

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
                FRAGE TEILEN
              </Text>
              <Text variant="headline" style={styles.headerTitle}>
                An wen?
              </Text>
            </View>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={onClose} />
          </View>

          {friends.isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : friends.friends.length === 0 ? (
            <View style={styles.state}>
              <Text variant="caption" color="muted" align="center">
                Du hast noch keine Freunde in QuizByte. Über den Freunde-Tab findest du sie per Benutzername.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {friends.friends.map((friend) => {
                const name = friend.displayName ?? friend.username;
                const done = alreadySent.includes(friend.id);
                return (
                  <Pressable
                    key={friend.id}
                    onPress={() => send(friend.id)}
                    disabled={done || busy !== null}
                    accessibilityRole="button"
                    accessibilityLabel={done ? `${name} – bereits gesendet` : `An ${name} senden`}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Avatar config={friend.avatarConfig} name={name} size={36} frame={equippedFrame(friend.selectedFrame)} />
                    <View style={styles.rowText}>
                      <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
                        {name}
                      </Text>
                      <Text variant="caption" color="muted" numberOfLines={1}>
                        @{friend.username}
                      </Text>
                    </View>

                    {busy === friend.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : done ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    ) : (
                      <Ionicons name="paper-plane-outline" size={19} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {share.isError ? (
            <Text variant="caption" style={[styles.error, { color: colors.danger }]}>
              {getUserMessage(share.error)}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 13, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
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
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  headerTitle: { letterSpacing: -0.2, color: colors.textPrimary },
  scroll: { flexShrink: 1 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  state: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 1 },
  name: { fontSize: 15, color: colors.textPrimary },
  error: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
}));

/** Dark whatever the theme, like every dialog in the app. */
export function SendToFriendDialog(props: SendToFriendDialogProps) {
  return (
    <FixedTheme scheme="dark">
      <SendToFriendDialogBody {...props} />
    </FixedTheme>
  );
}
