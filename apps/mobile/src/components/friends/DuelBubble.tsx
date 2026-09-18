import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { duelDeadlineLabel, duelExpired, duelScoreboard, equippedFrame, quizModeLabel } from '@quizbyte/shared';
import type { AvatarConfig, DuelScoreSlot } from '@quizbyte/shared';

import { modeImage } from '@/content/modeImages';
import { statIcon } from '@/content/statIcons';
import type { DuelSummary } from '@/services/api/friendsApi';
import { useNow } from '@/features/time/useNow';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { AppIcon, Avatar, Text } from '../ui';

interface DuelBubbleProps {
  duel: DuelSummary;
  /** True when I sent the challenge. */
  mine: boolean;
  friendName: string;
  friendAvatar?: AvatarConfig;
  friendFrame?: string | null;
  myAvatar?: AvatarConfig;
  myFrame?: string | null;
  myId: string | null;
  /** When the challenge was sent – the three days run from here. */
  createdAt: number;
  starting: boolean;
  onPlay: () => void;
  onDecline: () => void;
  /** Opens the full duel sheet. */
  onOpen: () => void;
}

/**
 * One duel, as a scoreboard rather than a paragraph.
 *
 * The mode's artwork across the top, then the two of you face to face with the
 * figure between. Everything that was prose – the tagline, the XP multiplier,
 * "warte auf X" – is either on the tile you picked the mode from or on the
 * sheet behind this card. A message in a chat has one job: say where the duel
 * stands, at a glance.
 */
export function DuelBubble({
  duel,
  mine,
  friendName,
  friendAvatar,
  friendFrame,
  myAvatar,
  myFrame,
  myId,
  createdAt,
  starting,
  onPlay,
  onDecline,
  onOpen,
}: DuelBubbleProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const now = useNow();

  const iAmChallenger = duel.challengerId === myId;
  // Played, not scored: the stored score only arrives once both sides are done.
  const iPlayed = iAmChallenger ? duel.challengerPlayed : duel.opponentPlayed;
  const artwork = modeImage(duel.mode);
  const expired = duelExpired(createdAt, now);

  const board = duelScoreboard({
    finished: duel.status === 'finished',
    closed: duel.status === 'declined' || expired,
    iPlayed,
    myCorrect: duel.myCorrect,
    theirCorrect: iAmChallenger ? duel.opponentCorrect : duel.challengerCorrect,
    mySettledCorrect: iAmChallenger ? duel.challengerCorrect : duel.opponentCorrect,
  });
  // "pending" as well as "active": a fresh challenge is pending until one of
  // the two starts playing, and that is when there is most to do about it.
  const open = (duel.status === 'active' || duel.status === 'pending') && !iPlayed && !expired;

  const iWon = duel.status === 'finished' && duel.winnerId === myId;
  const theyWon = duel.status === 'finished' && duel.winnerId !== null && duel.winnerId !== myId;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Duell, ${statusLine({ duel, mine, friendName, iPlayed, iWon, theyWon, expired })}`}
      style={({ pressed }) => [styles.body, pressed && styles.pressed]}
    >
      {/* Banner: the mode, full bleed, with its name on top of it. */}
      <View style={styles.banner}>
        {artwork ? (
          <Image source={artwork} style={styles.bannerImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : null}
        <View style={styles.bannerShade} />
        <View style={styles.bannerText}>
          <AppIcon source={statIcon('duels')} fallback="flash" size={16} glyphSize={14} color={colors.warning} />
          <Text variant="label" style={{ color: colors.warning }}>
            {quizModeLabel(duel.mode).toUpperCase()}-DUELL
          </Text>
        </View>
      </View>

      <View style={styles.inner}>
        {/* Under the scoreboard, not over it: a duel is the loudest thing in
            the chat and may carry a bit more light than a plain message. */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.10)', 'rgba(3, 7, 13, 0.22)']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Face to face, with the score between – or a dash where nobody has
            played yet. */}
        <View style={styles.match}>
          {/* "Du" rather than my own name: on my own side of a two-way score
              the name adds nothing my face does not already say. */}
          <Side name="Du" avatar={myAvatar} frame={myFrame} slot={board.mine} won={iWon} />
          <Text variant="title" style={styles.colon}>
            :
          </Text>
          <Side name={friendName} avatar={friendAvatar} frame={friendFrame} slot={board.theirs} won={theyWon} />
        </View>

        <Text
          variant="bodyStrong"
          align="center"
          numberOfLines={1}
          style={[
            styles.status,
            // Waiting is not news: grey, like everything the round is not
            // asking you to do.
            (iPlayed || expired) && { color: colors.textMuted },
            iWon && { color: colors.success },
            // Rot, wie überall sonst für falsch: eine Niederlage in Grau las
            // sich wie ein Zwischenstand.
            theyWon && { color: colors.danger },
          ]}
        >
          {statusLine({ duel, mine, friendName, iPlayed, iWon, theyWon, expired })}
        </Text>

        {/* The clock, only while it is still running and still matters. */}
        {open ? (
          <Text variant="label" color="muted" align="center">
            {duelDeadlineLabel(createdAt, now)}
          </Text>
        ) : null}

        {open ? (
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

            {/* Just a cross: declining is the lesser of the two choices, and a
                second button of equal weight would suggest otherwise. */}
            {mine ? null : (
              <Pressable
                onPress={onDecline}
                accessibilityRole="button"
                accessibilityLabel="Duell ablehnen"
                style={({ pressed }) => [styles.declineAction, { backgroundColor: colors.danger }, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={18} color={colors.white} />
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** One short line – never two. */
function statusLine({
  duel,
  mine,
  friendName,
  iPlayed,
  iWon,
  theyWon,
  expired,
}: {
  duel: DuelSummary;
  mine: boolean;
  friendName: string;
  iPlayed: boolean;
  iWon: boolean;
  theyWon: boolean;
  expired: boolean;
}): string {
  if (duel.status === 'finished') {
    if (iWon) return 'Gewonnen';
    if (theyWon) return 'Verloren';
    return 'Unentschieden';
  }
  if (duel.status === 'declined') return 'Abgelehnt';
  // Past the deadline but not yet scored – the next look at the chat closes it.
  if (expired) return 'Abgelaufen';
  if (iPlayed) return `Gespielt – warten auf ${friendName}`;
  return mine ? 'Herausforderung gesendet' : 'Du wurdest herausgefordert';
}

/** One player: face, score, name. */
function Side({
  name,
  avatar,
  frame,
  slot,
  won,
}: {
  name: string;
  avatar?: AvatarConfig;
  frame?: string | null;
  /** What this side is allowed to show – a number, a clock, or nothing. */
  slot: DuelScoreSlot;
  won: boolean;
}) {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.side}>
      <Avatar config={avatar} name={name} size={40} frame={equippedFrame(frame)} />

      {/* A clock instead of a number: that round is still open, and its score
          is nobody else's business until the duel is settled. */}
      {slot.kind === 'waiting' ? (
        <View style={styles.clock} accessibilityLabel="Noch offen">
          <Ionicons name="time-outline" size={22} color={colors.textMuted} />
        </View>
      ) : (
        <Text style={[styles.score, won && { color: colors.success }]}>
          {slot.kind === 'score' ? slot.correct : '–'}
        </Text>
      )}

      <Text variant="label" color="muted" numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  // No padding of its own – the banner runs to the edges.
  body: { overflow: 'hidden', borderRadius: radius.lg },
  pressed: { opacity: 0.75 },

  banner: { height: 56, backgroundColor: colors.warningSoft, justifyContent: 'flex-end' },
  bannerImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  // Keeps the label readable whatever the artwork is.
  bannerShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3, 7, 13, 0.5)' },
  bannerText: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm },

  inner: { padding: spacing.md, gap: spacing.sm, overflow: 'hidden' },
  match: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  side: { flex: 1, alignItems: 'center', gap: 2 },
  score: { fontSize: 24, fontWeight: '800', lineHeight: 28, color: colors.textPrimary },
  // Same box as the number, so a clock and a score sit on the same line.
  clock: { height: 28, alignItems: 'center', justifyContent: 'center' },
  colon: { color: colors.textMuted, marginBottom: 18 },
  status: { color: colors.textPrimary },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  playAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: radius.full,
  },
  declineAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    flexShrink: 0,
  },
}));
