import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Card, IconButton, ListRow, RowDivider, Screen, SwitchRow, Text } from '@/components/ui';
import { useResetProgress } from '@/features/settings/useResetProgress';
import { analytics } from '@/services/analytics/analytics';
import { getUserMessage } from '@/services/errors';
import { useSettingsStore } from '@/state/settingsStore';
import { spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const reset = useResetProgress();

  const confirmReset = () => {
    Alert.alert(
      'Fortschritt zurücksetzen?',
      'XP, Level, Streak und alle Statistiken werden unwiderruflich gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'destructive',
          onPress: () =>
            reset.mutate(undefined, {
              onError: (error) => Alert.alert('Fehler', getUserMessage(error)),
            }),
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Text variant="headline">Einstellungen</Text>
        <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
      </View>

      <Text variant="label" color="secondary" style={styles.sectionLabel}>
        QUIZ
      </Text>
      <Card padding="xs" style={styles.card}>
        <SwitchRow
          icon="volume-high-outline"
          label="Sound"
          description="Fragen-Audio abspielen (nutzt die Systemlautstärke)"
          value={soundEnabled}
          onValueChange={(value) => {
            setSoundEnabled(value);
            analytics.track('settings_changed', { setting: 'sound', value });
          }}
        />
        <RowDivider />
        <SwitchRow
          icon="phone-portrait-outline"
          label="Haptisches Feedback"
          description="Dezente Vibration bei Antworten"
          value={hapticsEnabled}
          onValueChange={(value) => {
            setHapticsEnabled(value);
            analytics.track('settings_changed', { setting: 'haptics', value });
          }}
        />
      </Card>

      <Text variant="label" color="secondary" style={styles.sectionLabel}>
        KONTO
      </Text>
      <Card padding="xs" style={styles.card}>
        <ListRow icon="person-outline" label="Profil" onPress={() => router.push('/profile')} />
        <RowDivider />
        <ListRow icon="lock-closed-outline" label="Datenschutz" onPress={() => router.push('/legal/datenschutz')} />
        <RowDivider />
        <ListRow icon="trash-outline" label="Fortschritt zurücksetzen" destructive onPress={confirmReset} />
      </Card>

      <Text variant="caption" color="muted">
        Du spielst als Gast. Dein Fortschritt ist auf diesem Gerät gespeichert. Ein Konto-Upgrade folgt in einer späteren Version.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sectionLabel: { marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { marginBottom: spacing.xl },
});
