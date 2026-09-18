import { useRouter } from 'expo-router';

import { resolveFrame } from '@quizbyte/shared';
import { useState } from 'react';

import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DeleteAccountDialog } from '@/components/auth/DeleteAccountDialog';
import { Avatar, Card, IconButton, ListRow, RowDivider, Screen, SwitchRow, Text } from '@/components/ui';
import { DifficultyPicker } from '@/components/quiz/DifficultyPicker';
import { DifficultyXpDialog } from '@/components/quiz/XpInfoDialog';
import { useAccount, useSignOut } from '@/features/auth/useAccount';
import { useSetPrivacySettings } from '@/features/profile/usePrivacySettings';
import { useProfile } from '@/features/profile/useProfile';
import { useProgress } from '@/features/progress/useProgress';
import { analytics } from '@/services/analytics/analytics';
import { getUserMessage } from '@/services/errors';
import { useSettingsStore } from '@/state/settingsStore';
import { makeStyles, spacing, useThemeColors } from '@/theme';

export default function SettingsScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const autoPlayAudio = useSettingsStore((state) => state.autoPlayAudio);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setAutoPlayAudio = useSettingsStore((state) => state.setAutoPlayAudio);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const difficulties = useSettingsStore((state) => state.difficulties);
  const setDifficulties = useSettingsStore((state) => state.setDifficulties);
  const onlyNewQuestions = useSettingsStore((state) => state.onlyNewQuestions);
  const setOnlyNewQuestions = useSettingsStore((state) => state.setOnlyNewQuestions);
  const profile = useProfile();
  const { level } = useProgress();
  const privacy = useSetPrivacySettings();
  /*
    While a switch is in flight the pending value is shown, not the stored one –
    otherwise the toggle would flick back for as long as the round trip takes.
  */
  const searchable = privacy.isPending ? privacy.variables.searchable : (profile.data?.searchable ?? true);
  const allowFriendRequests = privacy.isPending
    ? privacy.variables.allowFriendRequests
    : (profile.data?.allowFriendRequests ?? true);
  const account = useAccount();
  const signOut = useSignOut();
  const [xpInfo, setXpInfo] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const confirmSignOut = () => {
    Alert.alert(
      'Abmelden?',
      'Du spielst danach wieder als Gast weiter. Mit deiner E-Mail und deinem Passwort kommst du jederzeit zurück.',
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
    <Screen>
      <View style={styles.topBar}>
        <Text variant="headline">Einstellungen</Text>
        <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
      </View>

      <Text variant="label" color="secondary" style={styles.sectionLabel}>
        QUIZ
      </Text>
      <Card padding="xs" style={styles.card}>
        <View style={styles.difficultyRow}>
          <View style={styles.difficultyHead}>
            <Text variant="bodyStrong" style={styles.difficultyLabel}>
              Schwierigkeit
            </Text>
            <Pressable
              onPress={() => setXpInfo(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="XP-Verteilung anzeigen"
              style={({ pressed }) => pressed && styles.infoPressed}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <DifficultyPicker
            value={difficulties}
            onChange={(value) => {
              setDifficulties(value);
              analytics.track('settings_changed', { setting: 'difficulty', value: value.length === 0 ? 'all' : value.join('+') });
            }}
          />
          <Text variant="caption" color="muted">
            Mehrere Stufen lassen sich kombinieren. Gilt ab dem nächsten Quiz.
          </Text>
        </View>
        <RowDivider />
        <SwitchRow
          icon="sparkles-outline"
          iconFill={colors.warning}
          label="Neue Fragen zuerst"
          description="Runden ziehen zuerst Unbeantwortetes und füllen mit Bekanntem auf, wenn neue fehlen"
          value={onlyNewQuestions}
          onValueChange={(value) => {
            setOnlyNewQuestions(value);
            analytics.track('settings_changed', { setting: 'only_new_questions', value });
          }}
        />
        <RowDivider />
        <SwitchRow
          icon="volume-high-outline"
          iconFill={colors.success}
          label="Sound automatisch abspielen"
          description="Liest jede neue Frage von selbst vor. Aus: zum Vorlesen auf die Frage tippen"
          value={autoPlayAudio}
          onValueChange={(value) => {
            setAutoPlayAudio(value);
            analytics.track('settings_changed', { setting: 'auto_play_audio', value });
          }}
        />
        <RowDivider />
        <SwitchRow
          icon="phone-portrait-outline"
          iconFill={colors.textMuted}
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
        PRIVATSPHÄRE
      </Text>
      <Card padding="xs" style={styles.card}>
        {/*
          Both switches send both values – see useSetPrivacySettings. They are
          stored on the profile and enforced by the server: search_users skips
          anyone not searchable, send_friend_request refuses anyone who is not
          taking requests. Turning them off in the app alone would be a curtain,
          not a wall.
        */}
        <SwitchRow
          icon="search-outline"
          iconFill={colors.primary}
          label="In der Suche sichtbar"
          description="Andere können dich über deinen Benutzernamen finden"
          value={searchable}
          onValueChange={(value) => {
            privacy.mutate({ searchable: value, allowFriendRequests });
            analytics.track('settings_changed', { setting: 'searchable', value });
          }}
        />
        <RowDivider />
        <SwitchRow
          icon="person-add-outline"
          iconFill={colors.success}
          label="Freundschaftsanfragen erlauben"
          description="Aus: nur wer dich schon angefragt hat, erreicht dich noch"
          value={allowFriendRequests}
          onValueChange={(value) => {
            privacy.mutate({ searchable, allowFriendRequests: value });
            analytics.track('settings_changed', { setting: 'allow_friend_requests', value });
          }}
        />
      </Card>

      <Text variant="label" color="secondary" style={styles.sectionLabel}>
        KONTO
      </Text>
      <Card padding="xs" style={styles.card}>
        {/* The avatar instead of a person glyph – same as under "Mehr". */}
        <ListRow
          leading={
            <Avatar
              name={profile.data?.displayName ?? profile.data?.username ?? 'Profil'}
              config={profile.data?.avatarConfig}
              size={32}
              frame={resolveFrame(profile.data?.selectedFrame, level?.level ?? 1)}
            />
          }
          label="Profil"
          onPress={() => router.push('/profile')}
        />
        <RowDivider />
        <ListRow
          icon="shield-checkmark-outline"
          iconFill={colors.success}
          label={account.email ?? 'Konto'}
          onPress={() => router.push('/account')}
        />
        <RowDivider />
        {/* The only way back from a block: the person is hidden everywhere
            else by then, including in the search. */}
        <ListRow
          icon="ban-outline"
          iconFill={colors.danger}
          label="Blockierte Nutzer"
          onPress={() => router.push('/blocked')}
        />
        <RowDivider />
        <ListRow
          icon="lock-closed-outline"
          iconFill={colors.primary}
          label="Datenschutz"
          onPress={() => router.push('/legal/datenschutz')}
        />
        <RowDivider />
        {/* Das Konto, nicht nur der Fortschritt: die Statistiken allein
            zurückzusetzen hat niemand verlangt, und wer hier hinkommt, will in
            aller Regel weg. Gewarnt wird im Fenster – eine Alert-Box mit
            „Abbrechen/Löschen" ist für etwas, das nicht zurückzuholen ist, die
            falsche Hürde. */}
        <ListRow
          icon="trash-outline"
          iconFill={colors.danger}
          label="Konto löschen"
          destructive
          onPress={() => setDeleteOpen(true)}
        />
        <RowDivider />
        <ListRow
          icon="log-out-outline"
          iconFill={colors.danger}
          label={signOut.isPending ? 'Wird abgemeldet …' : 'Abmelden'}
          destructive
          onPress={confirmSignOut}
        />
      </Card>

      <Text variant="caption" color="muted">
        Angemeldet als {account.email}. Dein Fortschritt hängt am Konto, nicht am Gerät.
      </Text>

      <DifficultyXpDialog visible={xpInfo} onClose={() => setXpInfo(false)} />

      {/* Dasselbe Fenster wie unter „Konto": Wort tippen, Passwort eingeben.
          Ohne E-Mail gibt es kein Konto zu löschen. */}
      {account.email ? (
        <DeleteAccountDialog visible={deleteOpen} email={account.email} onClose={() => setDeleteOpen(false)} />
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sectionLabel: { marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { marginBottom: spacing.xl },
  difficultyRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  difficultyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  difficultyLabel: { color: colors.textPrimary },
  infoPressed: { opacity: 0.6 },
}));
