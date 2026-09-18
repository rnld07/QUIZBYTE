import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { duelScoreboard, equippedFrame, quizModeLabel } from '@quizbyte/shared';
import type { AvatarConfig, DuelScoreSlot, SessionSummary } from '@quizbyte/shared';

import { useFriends } from '@/features/friends/useFriends';
import { useProfile } from '@/features/profile/useProfile';
import type { DuelSummary } from '@/services/api/friendsApi';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Avatar, Card, Skeleton, Text } from '../ui';
import { ResultHero } from './ResultParts';

interface DuelResultProps {
  duel: DuelSummary | null;
  loading: boolean;
  /** Who the duel is against – the profile is read from the friends list. */
  friendId: string | null;
  summary: SessionSummary;
  myId: string | null;
}

/**
 * The end of a duel round.
 *
 * Not the mode's own result page: a duel is not measured against your last
 * round but against one other person, and the only two things worth saying are
 * how it stands and whether it is over. Until the other side has played, that
 * second answer is "not yet" – and the page says so rather than inventing a
 * winner out of one score.
 */
export function DuelResult({ duel, loading, friendId, summary, myId }: DuelResultProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const profile = useProfile();
  const friends = useFriends();
  const friend = friends.friends.find((entry) => entry.id === friendId) ?? null;
  const friendName = friend?.displayName ?? friend?.username ?? 'Dein Gegner';

  if (loading && !duel) {
    return (
      <View style={styles.loading}>
        <Skeleton height={120} borderRadius={radius.xxl} />
        <Skeleton height={150} borderRadius={radius.xxl} />
      </View>
    );
  }

  const iAmChallenger = duel?.challengerId === myId;
  const settled = duel?.status === 'finished';
  const iWon = settled && duel?.winnerId === myId;
  const drawn = settled && duel?.winnerId === null;
  const theyWon = settled && duel?.winnerId !== null && duel?.winnerId !== myId;

  const board = duelScoreboard({
    finished: settled,
    closed: duel?.status === 'declined',
    iPlayed: true,
    myCorrect: duel?.myCorrect ?? summary.correct,
    theirCorrect: iAmChallenger ? (duel?.opponentCorrect ?? null) : (duel?.challengerCorrect ?? null),
    mySettledCorrect: iAmChallenger ? (duel?.challengerCorrect ?? null) : (duel?.opponentCorrect ?? null),
  });

  const headline = !settled ? 'Gespielt' : iWon ? 'Gewonnen' : drawn ? 'Unentschieden' : 'Verloren';
  const tone = !settled ? colors.primary : iWon ? colors.success : drawn ? colors.warning : colors.danger;

  return (
    <>
      <ResultHero
        eyebrow={`${quizModeLabel(duel?.mode ?? 'classic').toUpperCase()}-DUELL`}
        headline={headline}
        headlineColor={tone}
        caption={
          settled
            ? iWon
              ? `Du warst besser als ${friendName}`
              : drawn
                ? 'Gleichstand – keiner war besser'
                : `${friendName} war diesmal besser`
            : `${friendName} ist noch dran`
        }
      />

      <Card elevated style={[styles.card, settled && { borderColor: tone }]}>
        <View style={styles.match}>
          <Side
            name="Du"
            avatar={profile.data?.avatarConfig}
            frame={profile.data?.selectedFrame}
            slot={board.mine}
            won={Boolean(iWon)}
          />
          <Text variant="title" style={styles.colon}>
            :
          </Text>
          <Side
            name={friendName}
            avatar={friend?.avatarConfig}
            frame={friend?.selectedFrame}
            slot={board.theirs}
            won={Boolean(theyWon)}
          />
        </View>

        <Text variant="caption" color="secondary" align="center">
          {settled
            ? 'Gezählt werden richtige Antworten.'
            : `Sobald ${friendName} gespielt hat, steht das Ergebnis hier und im Chat.`}
        </Text>
      </Card>
    </>
  );
}

/** One player: face, score, name. The clock stands for a round still to come. */
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
  slot: DuelScoreSlot;
  won: boolean;
}) {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <View style={styles.side}>
      <Avatar config={avatar} name={name} size={52} frame={equippedFrame(frame)} />

      {slot.kind === 'waiting' ? (
        <View style={styles.clock} accessibilityLabel="Noch offen">
          <Ionicons name="time-outline" size={26} color={colors.textMuted} />
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
  loading: { gap: spacing.md, marginBottom: spacing.lg },
  card: { gap: spacing.md, marginBottom: spacing.lg },
  match: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  side: { flex: 1, alignItems: 'center', gap: 2 },
  score: { fontSize: 30, fontWeight: '900', lineHeight: 34, color: colors.textPrimary },
  clock: { height: 34, alignItems: 'center', justifyContent: 'center' },
  colon: { color: colors.textMuted, marginBottom: 20 },
}));
