import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { duelScoreboard, equippedFrame, quizModeById, quizModeLabel, xpConfig } from '@quizbyte/shared';
import type { AvatarConfig, DuelScoreSlot } from '@quizbyte/shared';

import { modeImage } from '@/content/modeImages';
import type { DuelSummary } from '@/services/api/friendsApi';
import { FixedTheme, makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { Avatar, IconButton, Text } from '../ui';

interface DuelSummaryDialogProps {
  visible: boolean;
  duel: DuelSummary | null;
  myId: string | null;
  myName: string;
  myAvatar?: AvatarConfig;
  myFrame?: string | null;
  friendName: string;
  friendAvatar?: AvatarConfig;
  friendFrame?: string | null;
  /** True while a round is being set up – keeps the button from firing twice. */
  starting?: boolean;
  /** Plays the duel. Absent when there is nothing left to play. */
  onPlay?: () => void;
  /** Declines it. Absent when it was my own challenge. */
  onDecline?: () => void;
  onClose: () => void;
}

/**
 * The whole duel on one sheet: mode, both players, the score.
 *
 * The chat can only afford a line or two; this is where the names fit and the
 * result is actually legible.
 */
function DuelSummaryDialogBody({
  visible,
  duel,
  myId,
  myName,
  myAvatar,
  myFrame,
  friendName,
  friendAvatar,
  friendFrame,
  starting,
  onPlay,
  onDecline,
  onClose,
}: DuelSummaryDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();

  if (!visible || !duel) return null;

  const iAmChallenger = duel.challengerId === myId;
  const artwork = modeImage(duel.mode);

  // The same rule as in the chat: my round is mine to see once I have played
  // it, theirs stays a clock until the duel is settled.
  const board = duelScoreboard({
    finished: duel.status === 'finished',
    closed: duel.status === 'declined',
    iPlayed: iAmChallenger ? duel.challengerPlayed : duel.opponentPlayed,
    myCorrect: duel.myCorrect,
    theirCorrect: iAmChallenger ? duel.opponentCorrect : duel.challengerCorrect,
    mySettledCorrect: iAmChallenger ? duel.challengerCorrect : duel.opponentCorrect,
  });

  const headline =
    duel.status === 'finished'
      ? duel.winnerId === null
        ? 'Unentschieden'
        : duel.winnerId === myId
          ? 'Du hast gewonnen!'
          : `${friendName} hat gewonnen`
      : duel.status === 'declined'
        ? 'Abgelehnt'
        : 'Läuft noch';

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
                DUELL · {quizModeLabel(duel.mode).toUpperCase()}
              </Text>
              <Text variant="headline" style={styles.headerTitle}>
                {headline}
              </Text>
            </View>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={onClose} />
          </View>

          <View style={styles.body}>
            {artwork ? (
              <Image source={artwork} style={styles.artwork} contentFit="cover" cachePolicy="memory-disk" />
            ) : null}

            <Text variant="caption" color="secondary" align="center">
              {quizModeById(duel.mode).tagline}
            </Text>

            <View style={styles.players}>
              <PlayerColumn
                name={myName}
                avatar={myAvatar}
                frame={myFrame}
                slot={board.mine}
                winner={duel.status === 'finished' && duel.winnerId === myId}
              />
              <Text variant="title" style={styles.versus}>
                :
              </Text>
              <PlayerColumn
                name={friendName}
                avatar={friendAvatar}
                frame={friendFrame}
                slot={board.theirs}
                winner={duel.status === 'finished' && duel.winnerId !== null && duel.winnerId !== myId}
              />
            </View>

            <Text variant="caption" color="muted" align="center">
              {duel.status === 'finished'
                ? `Gezählt werden richtige Antworten. ${xpConfig.DUEL_WIN_XP} XP gibt es für den Sieg.`
                : duel.status === 'declined'
                  ? 'Dieses Duell wurde nicht gespielt.'
                  : `${String(xpConfig.DUEL_XP_MULTIPLIER).replace('.', ',')}-fache XP, ${xpConfig.DUEL_WIN_XP} XP für den Sieger.`}
            </Text>

            {/* The same pair as on the message: whoever opened this to decide
                should not have to close it again to act. */}
            {onPlay ? (
              <View style={styles.actions}>
                <Pressable
                  onPress={onPlay}
                  disabled={starting}
                  accessibilityRole="button"
                  accessibilityLabel="Duell spielen"
                  style={({ pressed }) => [styles.playAction, { backgroundColor: colors.success }, pressed && styles.pressed]}
                >
                  <Text variant="bodyStrong" style={{ color: colors.white }}>
                    Spielen
                  </Text>
                </Pressable>

                {onDecline ? (
                  <Pressable
                    onPress={onDecline}
                    accessibilityRole="button"
                    accessibilityLabel="Duell ablehnen"
                    style={({ pressed }) => [styles.declineAction, { backgroundColor: colors.danger }, pressed && styles.pressed]}
                  >
                    <Ionicons name="close" size={18} color={colors.white} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** One side of the duel: face, name, score. */
function PlayerColumn({
  name,
  avatar,
  frame,
  slot,
  winner,
}: {
  name: string;
  avatar?: AvatarConfig;
  frame?: string | null;
  /** What this side is allowed to show – a number, a clock, or nothing. */
  slot: DuelScoreSlot;
  winner: boolean;
}) {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.player}>
      <Avatar config={avatar} name={name} size={52} frame={equippedFrame(frame)} />
      {/* Two lines and centred: a name is not something to cut off with an
          ellipsis on the screen that is about who won. */}
      <Text variant="caption" align="center" numberOfLines={2} style={styles.playerName}>
        {name}
      </Text>
      {slot.kind === 'waiting' ? (
        <View style={styles.clock} accessibilityLabel="Noch offen">
          <Ionicons name="time-outline" size={24} color={colors.textMuted} />
        </View>
      ) : (
        <Text variant="title" style={[styles.score, winner && { color: colors.success }]}>
          {slot.kind === 'score' ? slot.correct : '–'}
        </Text>
      )}
    </View>
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
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.warning },
  headerTitle: { letterSpacing: -0.2, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.xl, gap: spacing.md, alignItems: 'center' },
  artwork: { width: 84, height: 84, borderRadius: radius.lg },
  players: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.xs },
  player: { flex: 1, alignItems: 'center', gap: spacing.xs },
  playerName: { color: colors.textSecondary },
  score: { color: colors.textPrimary },
  // Same height as the number so the two columns stay level.
  clock: { height: 30, alignItems: 'center', justifyContent: 'center' },
  versus: { color: colors.textMuted, marginTop: 18 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.xs },
  playAction: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: radius.full },
  declineAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    flexShrink: 0,
  },
  pressed: { opacity: 0.75 },
}));

/** Dark whatever the theme, like every dialog in the app. */
export function DuelSummaryDialog(props: DuelSummaryDialogProps) {
  return (
    <FixedTheme scheme="dark">
      <DuelSummaryDialogBody {...props} />
    </FixedTheme>
  );
}
