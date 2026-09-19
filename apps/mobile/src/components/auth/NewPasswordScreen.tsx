import { useState } from 'react';
import { View } from 'react-native';

import { validatePassword } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { useSetNewPassword } from '@/features/auth/useAccount';
import { getUserMessage } from '@/services/errors';
import { makeStyles, spacing } from '@/theme';

import { Logo } from '../brand/Logo';
import { Button, Card, Screen, Text, TextField } from '../ui';

const PASSWORD_MESSAGES = {
  empty: 'Bitte gib ein Passwort ein.',
  too_short: 'Mindestens 8 Zeichen.',
  too_long: 'Das Passwort ist zu lang.',
} as const;

interface NewPasswordScreenProps {
  /** Warum der Link nicht funktioniert hat; dann gibt es nichts zu setzen. */
  linkError: string | null;
  onDone: () => void;
}

/**
 * Das Ende des "Passwort vergessen"-Wegs.
 *
 * Steht vor allem anderen, sobald der Link aus der Mail die App geoeffnet hat.
 * Der Link meldet an – ohne diesen Bildschirm stuende man danach in der App und
 * haette immer noch kein Passwort, das man kennt.
 */
export function NewPasswordScreen({ linkError, onDone }: NewPasswordScreenProps) {
  const styles = useStyles();
  const setPassword = useSetNewPassword();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = () => {
    const check = validatePassword(value);
    if (!check.ok) {
      setError(PASSWORD_MESSAGES[check.error]);
      return;
    }
    setError(null);
    setPassword.mutate(check.value, {
      onSuccess: () => {
        setValue('');
        setDone(true);
      },
    });
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.head}>
        <Logo />
        <Text variant="headline" align="center">
          Neues Passwort
        </Text>
      </View>

      {linkError ? (
        <Card style={styles.card}>
          <Text color="secondary">{linkError}</Text>
          <Button title="Zurück zur Anmeldung" onPress={onDone} style={styles.action} />
        </Card>
      ) : done ? (
        <Card style={styles.card}>
          <Text color="secondary">Dein Passwort ist gesetzt. Du bist angemeldet.</Text>
          <Button title="Weiter" onPress={onDone} style={styles.action} />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text color="secondary">Wähle ein neues Passwort für dein Konto.</Text>
          <TextField
            label="NEUES PASSWORT"
            value={value}
            onChangeText={setValue}
            secure
            hint="Mindestens 8 Zeichen"
            error={error}
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          {setPassword.isError ? (
            <Text variant="caption" color="danger">
              {getUserMessage(setPassword.error)}
            </Text>
          ) : null}
          <Button
            title={setPassword.isPending ? 'Wird gesetzt …' : 'Passwort speichern'}
            onPress={submit}
            disabled={setPassword.isPending}
            style={styles.action}
          />
        </Card>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  head: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  card: { gap: spacing.md, marginTop: spacing.lg },
  action: { marginTop: spacing.xs },
}));
