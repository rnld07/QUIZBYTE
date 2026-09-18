import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Avatar, EmptyState, ErrorState, IconButton, RaisedCard, Screen, Skeleton, Text } from '@/components/ui';
import { useBlockUser, useBlockedUsers } from '@/features/friends/useModeration';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

/**
 * Everyone you have blocked, and the way back.
 *
 * Its own page rather than a row on the profile of somebody you can no longer
 * find: blocking hides that person everywhere, so the only place the undo can
 * live is a list of its own.
 */
export default function BlockedUsersScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { blocked, isLoading, isError, error, refetch } = useBlockedUsers();
  const { unblock } = useBlockUser();

  const confirmUnblock = (id: string, username: string) => {
    Alert.alert(`@${username} entsperren?`, 'Ihr findet euch wieder in der Suche und könnt euch Anfragen schicken. Die Freundschaft kommt dadurch nicht zurück.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entsperren', onPress: () => unblock.mutate(id) },
    ]);
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline">Blockiert</Text>
      </View>

      {unblock.isError ? <Text color="danger" style={styles.error}>{getUserMessage(unblock.error)}</Text> : null}

      {isLoading ? (
        <View style={styles.list}>
          <Skeleton height={64} borderRadius={radius.xl} />
          <Skeleton height={64} borderRadius={radius.xl} />
        </View>
      ) : isError ? (
        <ErrorState message={getUserMessage(error)} onRetry={() => void refetch()} />
      ) : blocked.length === 0 ? (
        <EmptyState
          icon="ban-outline"
          title="Niemand blockiert"
          message="Wen du blockierst, findest du hier wieder – und kannst es zurücknehmen."
        />
      ) : (
        <View style={styles.list}>
          {blocked.map((entry) => (
            <RaisedCard key={entry.id} style={styles.row}>
              <Avatar config={entry.avatarConfig} name={entry.displayName ?? entry.username} size={40} />
              <View style={styles.texts}>
                <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
                  {entry.displayName ?? entry.username}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  @{entry.username}
                </Text>
              </View>

              <Pressable
                onPress={() => confirmUnblock(entry.id, entry.username)}
                disabled={unblock.isPending}
                accessibilityRole="button"
                accessibilityLabel={`${entry.username} entsperren`}
                style={({ pressed }) => [styles.action, { borderColor: colors.borderStrong }, pressed && styles.pressed]}
              >
                <Text variant="label" color="accent">
                  Entsperren
                </Text>
              </Pressable>
            </RaisedCard>
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  list: { gap: spacing.sm },
  error: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  texts: { flex: 1, gap: 1 },
  name: { color: colors.textPrimary },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pressed: { opacity: 0.6 },
}));
