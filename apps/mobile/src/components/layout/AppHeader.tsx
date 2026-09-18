import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { resolveFrame } from '@quizbyte/shared';

import { useProgress } from '@/features/progress/useProgress';
import { useProfile } from '@/features/profile/useProfile';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { AppIcon, Avatar, Skeleton } from '../ui';
import { Wordmark } from '../brand/Wordmark';
import { LevelPill } from '../progress/LevelPill';

/**
 * Global header: settings (left), logo + QuizByte wordmark with the level
 * underneath (centre), profile (right).
 */
interface AppHeaderProps {
  /** Hide the level bar where the screen already shows it in full. */
  showLevel?: boolean;
}

export function AppHeader({ showLevel = true }: AppHeaderProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { level, isLoading } = useProgress();
  const profile = useProfile();
  const name = profile.data?.displayName ?? profile.data?.username ?? 'Profil';

  return (
    <View style={styles.container}>
      {/* Settings button */}
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel="Einstellungen öffnen"
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        {/* Keeps its framed plate; only the glyph inside can be swapped. */}
        <AppIcon name="settings" fallback="settings-outline" size={40} glyphSize={23} color={colors.textSecondary} />
      </Pressable>

      {/* Wordmark + level */}
      <Pressable
        onPress={() => router.push('/(tabs)/progress')}
        accessibilityRole="button"
        accessibilityLabel={level ? `Level ${level.level}, ${level.xpIntoLevel} von ${level.xpForLevel} XP` : 'Fortschritt öffnen'}
        style={styles.center}
      >
        {/* The lettering alone. The mark beside it said the same word twice. */}
        <Wordmark />

        {!showLevel ? null : isLoading || !level ? (
          <Skeleton width={116} height={8} style={styles.skeletonBar} />
        ) : (
          <LevelPill level={level} />
        )}
      </Pressable>

      {/* Profile button */}
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel="Profil öffnen"
        hitSlop={8}
        style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}
      >
        <Avatar
          name={name}
          config={profile.data?.avatarConfig}
          size={44}
          frame={resolveFrame(profile.data?.selectedFrame, level?.level ?? 1)}
        />
      </Pressable>
    </View>
  );
}

const CONTROL_SIZE = 50;

const useStyles = makeStyles((colors, shadows, gradients) => ({
  /*
    Über allem, was darunter folgt.

    Das "LVL UP!"-Band hängt unter der Level-Pille und ragt aus dem Kopfbereich
    heraus – ohne diese beiden Zeilen zeichnet die Tagesquiz-Karte darüber, weil
    sie später im Baum kommt und mit ihrem Schatten eine höhere Ebene hat.
    `zIndex` allein reicht auf Android nicht: dort entscheidet `elevation`
    zuerst, und die Karten bringen bis zu 10 mit. Der Kopfbereich hat keinen
    eigenen Hintergrund, also wirft die Erhöhung auch keinen Schatten.
  */
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    gap: spacing.md,
    zIndex: 30,
    elevation: 30,
  },
  iconBtn: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    maxWidth: 220,
    alignSelf: 'center',
    zIndex: 1,
    elevation: 1,
  },
  skeletonBar: { marginTop: 3 },
  avatarBtn: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
}));
