import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useSignOut } from '@/features/auth/useAccount';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Button, Text } from '../ui';

interface SuspendedScreenProps {
  /** What the admin wrote when suspending, if anything. */
  reason: string | null;
}

/**
 * What a suspended account sees instead of the app.
 *
 * A wall, not a lock: the account cannot write anything either way – the
 * policies see to that – and this is only here so the person is told why,
 * rather than watching every tap fail without explanation.
 *
 * Signing out is the one thing still on offer. It is also how the screen goes
 * away again once a suspension is lifted: the profile is read at start-up.
 */
export function SuspendedScreen({ reason }: SuspendedScreenProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const signOut = useSignOut();

  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <Ionicons name="lock-closed" size={30} color={colors.danger} />
      </View>

      <Text variant="headline" align="center">
        Konto gesperrt
      </Text>

      <Text color="secondary" align="center" style={styles.text}>
        Ein Administrator hat dieses Konto gesperrt. Spielen, Melden und Freundschaftsanfragen sind damit nicht mehr
        möglich.
      </Text>

      {reason ? (
        <View style={styles.reason}>
          <Text variant="label" color="muted">
            BEGRÜNDUNG
          </Text>
          <Text variant="caption" color="secondary">
            {reason}
          </Text>
        </View>
      ) : null}

      <Text variant="caption" color="muted" align="center" style={styles.text}>
        Wenn du das für einen Fehler hältst, schreib uns über den TikTok-Account oder die im Impressum genannte Adresse.
      </Text>

      <Button
        title="Abmelden"
        variant="secondary"
        onPress={() => signOut.mutate()}
        loading={signOut.isPending}
        style={styles.action}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.danger}1F`,
    borderWidth: 1,
    borderColor: `${colors.danger}55`,
    marginBottom: spacing.xs,
  },
  text: { maxWidth: 320 },
  reason: {
    alignSelf: 'stretch',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  action: { alignSelf: 'stretch', marginTop: spacing.md },
}));
