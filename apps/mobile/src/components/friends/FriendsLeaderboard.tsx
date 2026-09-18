import { Pressable, View } from 'react-native';

import { buildLeaderboard, computeLevelProgress, equippedFrame } from '@quizbyte/shared';
import type { AvatarConfig } from '@quizbyte/shared';

import { makeStyles, PLACE_COLORS, radius, spacing, useThemeColors } from '@/theme';

import { Avatar, Skeleton, Text } from '../ui';

export interface LeaderboardPlayer {
  id: string;
  username: string;
  displayName: string | null;
  avatarConfig: AvatarConfig;
  selectedFrame?: string | null;
  totalXp: number;
}

interface FriendsLeaderboardProps {
  players: LeaderboardPlayer[];
  meId: string | null;
  loading?: boolean;
  /** Opens a friend's profile; not called for your own row. */
  onPress: (id: string) => void;
}

/**
 * Who is ahead, among the people you actually know.
 *
 * You are in it: a ranking of everyone else is a scoreboard you are not playing
 * on. Your own row is marked and not tappable – you came from your own profile
 * often enough.
 */
export function FriendsLeaderboard({ players, meId, loading, onPress }: FriendsLeaderboardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const board = buildLeaderboard(players, meId);

  if (loading) {
    return (
      <View style={styles.skeletons}>
        <Skeleton height={44} borderRadius={12} />
        <Skeleton height={44} borderRadius={12} />
      </View>
    );
  }

  return (
    <View>
      {board.map(({ entry, rank, isMe }, index) => {
        const name = entry.displayName ?? entry.username;
        const level = computeLevelProgress(entry.totalXp).level;
        const place = PLACE_COLORS[rank];

        return (
          <Pressable
            key={entry.id}
            onPress={() => !isMe && onPress(entry.id)}
            disabled={isMe}
            accessibilityRole={isMe ? 'text' : 'button'}
            accessibilityLabel={`Platz ${rank}: ${name}, Level ${level}, ${entry.totalXp} XP`}
            style={({ pressed }) => [
              styles.row,
              isMe && { backgroundColor: colors.primarySoft },
              pressed && styles.pressed,
            ]}
          >
            {/* The place as a figure, in gold, silver or bronze for the first
                three. A ranking is read by its numbers. */}
            <View style={styles.rank}>
              <Text style={[styles.rankNumber, place ? { color: place } : null]}>{rank}</Text>
            </View>

            <Avatar config={entry.avatarConfig} name={name} size={32} frame={equippedFrame(entry.selectedFrame)} />

            <Text variant="bodyStrong" numberOfLines={1} style={[styles.name, isMe && { color: colors.primary }]}>
              {isMe ? 'Du' : name}
            </Text>

            {/* The level alone. The XP decide the order, but reading them off
                every row turned a ranking into a table – the place on the left
                already says who is ahead. */}
            <Text variant="bodyStrong" style={styles.level}>
              lvl {level}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  skeletons: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    // The card around it is round at the corners; a squarer block inside it
    // read as a second, harder shape rather than as part of the same card.
    borderRadius: radius.xl,
  },
  pressed: { opacity: 0.65 },
  rank: { width: 24, alignItems: 'center' },
  rankNumber: { fontSize: 16, fontWeight: '800', color: colors.textMuted },
  name: { flex: 1, fontSize: 15, color: colors.textPrimary },
  // Right-aligned as a block: XP is the figure being compared, the level only
  // says what it amounts to.
  level: { color: colors.textPrimary, flexShrink: 0 },
}));
