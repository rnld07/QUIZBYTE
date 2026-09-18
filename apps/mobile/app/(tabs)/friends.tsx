import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, TextInput, View } from 'react-native';

import { equippedFrame } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { AppHeader } from '@/components/layout/AppHeader';
import { FriendRow } from '@/components/friends/FriendRow';
import { FriendsLeaderboard } from '@/components/friends/FriendsLeaderboard';
import type { LeaderboardPlayer } from '@/components/friends/FriendsLeaderboard';
import { AppIcon, Avatar, Card, EmptyState, ErrorState, RaisedCard, Screen, SectionHeading, Skeleton, Text } from '@/components/ui';
import { appInfo } from '@/config/app';
import {
  useFriendRequests,
  useFriends,
  useRespondFriendRequest,
  useSendFriendRequest,
  useUnreadCounts,
  useUserSearch,
} from '@/features/friends/useFriends';
import { useProfile } from '@/features/profile/useProfile';
import { useProgress } from '@/features/progress/useProgress';
import { getUserMessage } from '@/services/errors';
import { useAuthStore } from '@/state/authStore';
import { makeStyles, radius, spacing, typography, useThemeColors } from '@/theme';

const INVITE_MESSAGE = `Ich lerne grade Informatik mit der ${appInfo.name} App. Man kann Quizfragen zu den Grundlagen, Hardware, Fachinformatik und noch viel mehr beantworten und so im Level aufsteigen und sich mit Freunden messen. Probiers aus!`;

export default function FriendsScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const [term, setTerm] = useState('');

  const friends = useFriends();
  const requests = useFriendRequests();
  const search = useUserSearch(term);
  const sendRequest = useSendFriendRequest();
  const respond = useRespondFriendRequest();
  const unread = useUnreadCounts();
  const profile = useProfile();
  const progress = useProgress();
  const myId = useAuthStore((state) => state.userId);

  // My own row is built here rather than fetched: everything it needs is
  // already on screen, and the friend list has no entry for me.
  const leaderboard: LeaderboardPlayer[] = [
    ...friends.friends.map((friend) => ({
      id: friend.id,
      username: friend.username,
      displayName: friend.displayName,
      avatarConfig: friend.avatarConfig,
      selectedFrame: friend.selectedFrame,
      totalXp: friend.totalXp,
    })),
    ...(myId && profile.data
      ? [
          {
            id: myId,
            username: profile.data.username,
            displayName: profile.data.displayName,
            avatarConfig: profile.data.avatarConfig,
            selectedFrame: profile.data.selectedFrame,
            totalXp: progress.progress?.totalXp ?? 0,
          },
        ]
      : []),
  ];

  const invite = () => {
    void Share.share({ message: INVITE_MESSAGE });
  };

  return (
    <Screen withTabBar scrollToTopKey="friends" backdrop={<AmbientBackground />}>
      <AppHeader showLevel={false} />

      {/* Search */}
      <View style={styles.section}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Freund über den Benutzernamen suchen"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            accessibilityLabel="Freunde suchen"
          />
          {term.length > 0 ? (
            <Pressable onPress={() => setTerm('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Suche leeren">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {term.trim().length >= 2 ? (
          <RaisedCard style={styles.card}>
            {search.isLoading ? (
              <View style={styles.skeletons}>
                <Skeleton height={40} borderRadius={8} />
                <Skeleton height={40} borderRadius={8} />
              </View>
            ) : search.isError ? (
              <ErrorState compact message={getUserMessage(search.error)} onRetry={() => void search.refetch()} />
            ) : search.results.length === 0 ? (
              <Text variant="caption" color="muted" style={styles.empty}>
                Niemand gefunden. Benutzernamen müssen genau stimmen.
              </Text>
            ) : (
              search.results.map((result, i) => (
                <View key={result.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <FriendRow
                    username={result.username}
                    displayName={result.displayName}
                    avatarConfig={result.avatarConfig}
                    frameId={result.selectedFrame}
                    subtitle={
                      result.status === 'friends'
                        ? 'Ihr seid befreundet'
                        : result.status === 'requested'
                          ? 'Anfrage gesendet'
                          : result.status === 'incoming'
                            ? 'Hat dir eine Anfrage geschickt'
                            : `@${result.username}`
                    }
                    action={
                      result.status === 'none' || result.status === 'incoming'
                        ? {
                            icon: 'person-add-outline',
                            label: result.status === 'incoming' ? 'Anfrage annehmen' : 'Freund hinzufügen',
                            busy: sendRequest.isPending,
                            onPress: () => sendRequest.mutate(result.id),
                          }
                        : undefined
                    }
                    onPress={result.status === 'friends' ? () => router.push({ pathname: '/friends/[id]', params: { id: result.id } }) : undefined}
                  />
                </View>
              ))
            )}
          </RaisedCard>
        ) : null}
      </View>

      {/* Ranking – first, because it is the reason to have friends in a quiz app */}
      {friends.friends.length > 0 || progress.progress ? (
        <View style={styles.section}>
          <SectionHeading title="Rangliste" />
          <RaisedCard style={styles.rankCard}>
            <FriendsLeaderboard
              players={leaderboard}
              meId={myId}
              loading={friends.isLoading || profile.isLoading}
              onPress={(id) => router.push({ pathname: '/friends/[id]', params: { id } })}
            />
          </RaisedCard>
        </View>
      ) : null}

      {/* Incoming requests */}
      {requests.requests.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading title="Anfragen" />
          <RaisedCard style={styles.card}>
            {requests.requests.map((request, i) => (
              <View key={request.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.requestRow}>
                  <Avatar
                    config={request.avatarConfig}
                    name={request.displayName ?? request.username}
                    size={40}
                    frame={equippedFrame(request.selectedFrame)}
                  />
                  <View style={styles.requestText}>
                    <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
                      {request.displayName ?? request.username}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={1}>
                      @{request.username}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => respond.mutate({ id: request.id, accept: false })}
                    disabled={respond.isPending}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Ablehnen"
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => respond.mutate({ id: request.id, accept: true })}
                    disabled={respond.isPending}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Annehmen"
                    style={({ pressed }) => [styles.iconButton, styles.acceptButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            ))}
          </RaisedCard>
        </View>
      ) : null}

      {/* Friend list */}
      <View style={styles.section}>
        {/* The whole tab in one figure, so the rows below are worth scanning. */}
        <SectionHeading
          title="Deine Freunde"
          trailing={
            unread.total > 0 ? (
              <View style={[styles.unreadPill, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
                <Ionicons name="chatbubble-ellipses" size={13} color={colors.success} />
                <Text variant="label" style={{ color: colors.success }}>
                  {unread.total} {unread.total === 1 ? 'ungelesene Nachricht' : 'ungelesene Nachrichten'}
                </Text>
              </View>
            ) : null
          }
        />
        <RaisedCard style={styles.card}>
          {friends.isLoading ? (
            <View style={styles.skeletons}>
              <Skeleton height={40} borderRadius={8} />
              <Skeleton height={40} borderRadius={8} />
            </View>
          ) : friends.isError ? (
            <ErrorState compact message={getUserMessage(friends.error)} onRetry={() => void friends.refetch()} />
          ) : friends.friends.length === 0 ? (
            <EmptyState
              compact
              icon="people-outline"
              title="Noch keine Freunde"
              message="Such oben nach einem Benutzernamen oder empfiehl die App weiter."
            />
          ) : (
            friends.friends.map((friend, i) => (
              <View key={friend.id}>
                {i > 0 && <View style={styles.divider} />}
                <FriendRow
                  username={friend.username}
                  displayName={friend.displayName}
                  avatarConfig={friend.avatarConfig}
                  frameId={friend.selectedFrame}
                  subtitle={
                    unread.counts[friend.id]
                      ? `${unread.counts[friend.id]} neue ${unread.counts[friend.id] === 1 ? 'Nachricht' : 'Nachrichten'}`
                      : `Level ${friend.level}`
                  }
                  action={{
                    icon: 'chatbubble-ellipses-outline',
                    label: 'Chat öffnen',
                    bare: true,
                    badge: unread.counts[friend.id],
                    onPress: () => router.push({ pathname: '/friends/chat/[id]', params: { id: friend.id } }),
                  }}
                  // The row leads to the chat, the face to the person: talking
                  // is what you come to a friends list for, looking up someone's
                  // level is the rarer errand.
                  onPress={() => router.push({ pathname: '/friends/chat/[id]', params: { id: friend.id } })}
                  hint="Öffnet den Chat"
                  onAvatarPress={() => router.push({ pathname: '/friends/[id]', params: { id: friend.id } })}
                />
              </View>
            ))
          )}
        </RaisedCard>
      </View>

      {/* Invite */}
      <Card padding="xs">
        <Pressable
          onPress={invite}
          accessibilityRole="button"
          accessibilityLabel="QuizByte weiterempfehlen"
          style={({ pressed }) => [styles.inviteRow, pressed && styles.pressed]}
        >
          <View style={styles.inviteIcon}>
            <AppIcon name="invite-friends" fallback="gift-outline" size={66} glyphSize={24} color={colors.primary} />
          </View>
          <View style={styles.requestText}>
            <Text variant="bodyStrong" style={styles.name}>
              App weiterempfehlen
            </Text>
            <Text variant="caption" color="muted">
              Lade Freunde zu QuizByte ein
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  card: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  // Only the ranking: its rows carry their own side padding, so the highlight
  // behind "Du" can reach as close to the edge as it does top and bottom. The
  // lists beside it keep the normal inset – an avatar against the card edge
  // looks like something slipped.
  rankCard: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  skeletons: { gap: spacing.sm },
  empty: { paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { ...typography.body, flex: 1, color: colors.textPrimary, paddingVertical: spacing.md },

  requestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  requestText: { flex: 1, gap: 2 },
  name: { fontSize: 15, color: colors.textPrimary },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  acceptButton: { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
  pressed: { opacity: 0.65 },

  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  // No plate behind it – the symbol brings its own shape.
  inviteIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}));
