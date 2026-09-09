import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { computeAccuracy, validateDisplayName, validateUsername } from '@quizbyte/shared';
import type { UsernameError } from '@quizbyte/shared';

import { Avatar, Button, Card, ErrorState, IconButton, Screen, Skeleton, Text } from '@/components/ui';
import { StatGrid, StatTile } from '@/components/progress/StatTile';
import { useProfile, useUpdateProfile } from '@/features/profile/useProfile';
import { useProgress } from '@/features/progress/useProgress';
import { getUserMessage } from '@/services/errors';
import { colors, radius, spacing, typography } from '@/theme';

const USERNAME_MESSAGES: Record<UsernameError, string> = {
  too_short: 'Mindestens 3 Zeichen.',
  too_long: 'Maximal 20 Zeichen.',
  invalid_chars: 'Nur a-z, 0-9, Punkt und Unterstrich.',
  invalid_edge: 'Darf nicht mit einem Punkt beginnen oder enden.',
  consecutive_dots: 'Keine zwei Punkte hintereinander.',
};

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useProfile();
  const progress = useProgress();
  const update = useUpdateProfile();
  // Local edits are stored as overrides so the form shows server values until the user types.
  const [usernameInput, setUsernameInput] = useState<string | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const username = usernameInput ?? profile.data?.username ?? '';
  const displayName = displayNameInput ?? profile.data?.displayName ?? '';
  const dirty = profile.data ? username !== profile.data.username || displayName !== (profile.data.displayName ?? '') : false;

  const save = () => {
    setSaved(false);
    const usernameResult = validateUsername(username);
    if (!usernameResult.ok) {
      setValidationError(USERNAME_MESSAGES[usernameResult.error]);
      return;
    }
    const displayResult = validateDisplayName(displayName);
    if (!displayResult.ok) {
      setValidationError('Der Anzeigename ist zu lang (max. 40 Zeichen).');
      return;
    }
    setValidationError(null);
    update.mutate(
      { username: usernameResult.value, displayName: displayResult.value },
      {
        onSuccess: () => {
          setUsernameInput(null);
          setDisplayNameInput(null);
          setSaved(true);
        },
      },
    );
  };

  const data = progress.progress;

  return (
    <Screen>
      <View style={styles.topBar}>
        <Text variant="headline">Profil</Text>
        <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
      </View>

      {profile.isError ? (
        <ErrorState message={getUserMessage(profile.error)} onRetry={() => void profile.refetch()} />
      ) : (
        <>
          <View style={styles.hero}>
            {profile.isLoading ? (
              <Skeleton width={72} height={72} borderRadius={36} />
            ) : (
              <Avatar name={profile.data?.displayName ?? profile.data?.username ?? '?'} imageUrl={profile.data?.avatarUrl} size={72} />
            )}
            <Text variant="title">{profile.data?.displayName ?? profile.data?.username ?? ''}</Text>
            {profile.data?.displayName ? (
              <Text color="secondary">@{profile.data.username}</Text>
            ) : null}
          </View>

          <StatGrid>
            <StatTile label="Level" value={String(progress.level?.level ?? 1)} loading={progress.isLoading} />
            <StatTile label="XP gesamt" value={String(data?.totalXp ?? 0)} loading={progress.isLoading} />
            <StatTile label="Streak" value={`${progress.streak} Tage`} loading={progress.isLoading} />
            <StatTile label="Beantwortet" value={String(data?.totalQuestionsAnswered ?? 0)} loading={progress.isLoading} />
            <StatTile
              label="Accuracy"
              value={`${computeAccuracy(data?.totalCorrectAnswers ?? 0, data?.totalQuestionsAnswered ?? 0)} %`}
              loading={progress.isLoading}
            />
          </StatGrid>

          <Card style={styles.form}>
            <Text variant="headline">Bearbeiten</Text>
            <View style={styles.field}>
              <Text variant="label" color="secondary">
                BENUTZERNAME
              </Text>
              <TextInput
                value={username}
                onChangeText={(value) => setUsernameInput(value.toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                placeholder="benutzername"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                accessibilityLabel="Benutzername"
              />
            </View>
            <View style={styles.field}>
              <Text variant="label" color="secondary">
                ANZEIGENAME
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayNameInput}
                maxLength={40}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                accessibilityLabel="Anzeigename"
              />
            </View>
            {validationError ? <Text color="danger">{validationError}</Text> : null}
            {update.isError ? <Text color="danger">{getUserMessage(update.error)}</Text> : null}
            {saved && !dirty ? <Text color="success">Gespeichert.</Text> : null}
            <Button title="Speichern" onPress={save} disabled={!dirty || profile.isLoading} loading={update.isPending} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  form: { marginTop: spacing.xl, gap: spacing.md },
  field: { gap: spacing.xs },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
});
