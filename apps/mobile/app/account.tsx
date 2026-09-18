import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { DeleteAccountDialog } from '@/components/auth/DeleteAccountDialog';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Button, Card, IconButton, Screen, Text } from '@/components/ui';
import { useAccount, useSignOut } from '@/features/auth/useAccount';
import { useProfile } from '@/features/profile/useProfile';
import { analytics } from '@/services/analytics/analytics';
import { getUserMessage } from '@/services/errors';
import { makeStyles, spacing, useThemeColors } from '@/theme';

/**
 * What the signed-in account is, and the way out of it.
 *
 * Signing in and signing up happen at the gate in front of the app, not here –
 * by the time this screen is reachable there is always an account.
 */
export default function AccountScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { email, pendingEmail } = useAccount();
  const profile = useProfile();
  const signOut = useSignOut();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const confirmSignOut = () => {
    Alert.alert(
      'Abmelden?',
      'Du landest wieder auf dem Anmeldebildschirm. Mit deiner E-Mail und deinem Passwort kommst du jederzeit zurück.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: () =>
            signOut.mutate(undefined, {
              onSuccess: () => analytics.track('signed_out', {}),
              onError: (error) => Alert.alert('Fehler', getUserMessage(error)),
            }),
        },
      ],
    );
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <Text variant="headline">Konto</Text>
        <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
      </View>

      <Card elevated style={styles.card}>
        <View style={styles.headRow}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <Text variant="bodyStrong">Dein Fortschritt ist gesichert</Text>
        </View>
        <Text variant="caption" color="secondary">
          Mit diesen Daten kommst du auf jedem Gerät an dein Konto.
        </Text>

        <View style={styles.detail}>
          <Text variant="label" color="muted">
            E-MAIL
          </Text>
          <Text variant="bodyStrong">{email ?? '–'}</Text>
        </View>

        <View style={styles.detail}>
          <Text variant="label" color="muted">
            BENUTZERNAME
          </Text>
          <Text variant="bodyStrong">{profile.data?.username ?? '–'}</Text>
        </View>

        {pendingEmail ? (
          <Text variant="caption" style={{ color: colors.warning }}>
            Für {pendingEmail} liegt noch eine Bestätigungsmail in deinem Postfach. Bis du sie öffnest, gilt die alte Adresse.
          </Text>
        ) : null}
      </Card>

      <Button
        title={signOut.isPending ? 'Wird abgemeldet …' : 'Abmelden'}
        variant="secondary"
        onPress={confirmSignOut}
        disabled={signOut.isPending}
      />

      {/* At the bottom, on its own, and quiet: it is the one action here that
          cannot be taken back. The dialog does the actual warning. */}
      <Pressable
        onPress={() => setDeleteOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Konto löschen"
        style={({ pressed }) => [styles.danger, pressed && styles.pressed]}
      >
        <Text variant="label" style={{ color: colors.danger }}>
          Konto löschen
        </Text>
      </Pressable>

      {email ? <DeleteAccountDialog visible={deleteOpen} email={email} onClose={() => setDeleteOpen(false)} /> : null}
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detail: { gap: 2, marginTop: spacing.xs },
  danger: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  pressed: { opacity: 0.6 },
}));
