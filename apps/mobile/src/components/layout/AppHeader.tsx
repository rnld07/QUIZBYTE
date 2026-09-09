import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useProgress } from '@/features/progress/useProgress';
import { useProfile } from '@/features/profile/useProfile';
import { colors, spacing } from '@/theme';

import { Avatar, IconButton, ProgressBar, Skeleton, Text } from '../ui';

/**
 * Global header: settings (left), level + XP progress (centre), profile (right).
 */
export function AppHeader() {
  const router = useRouter();
  const { level, isLoading } = useProgress();
  const profile = useProfile();
  const name = profile.data?.displayName ?? profile.data?.username ?? 'Profil';

  return (
    <View style={styles.container}>
      <IconButton icon="settings-outline" accessibilityLabel="Einstellungen öffnen" onPress={() => router.push('/settings')} />

      <Pressable
        onPress={() => router.push('/(tabs)/progress')}
        accessibilityRole="button"
        accessibilityLabel={level ? `Level ${level.level}, ${level.xpIntoLevel} von ${level.xpForLevel} XP` : 'Fortschritt öffnen'}
        style={styles.center}
      >
        {isLoading || !level ? (
          <>
            <Skeleton width={72} height={14} />
            <Skeleton width={120} height={6} style={styles.skeletonBar} />
          </>
        ) : (
          <>
            <Text variant="bodyStrong">Level {level.level}</Text>
            <ProgressBar value={level.progressPercent} height={5} style={styles.bar} />
            <Text variant="caption" color="secondary">
              {level.xpIntoLevel} / {level.xpForLevel} XP
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel="Profil öffnen"
        hitSlop={8}
        style={styles.avatarButton}
      >
        <Avatar name={name} imageUrl={profile.data?.avatarUrl} size={36} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', gap: 4, maxWidth: 200, alignSelf: 'center' },
  bar: { width: 120 },
  skeletonBar: { marginTop: 4 },
  avatarButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.background },
});
