import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { validateEmail, validatePassword, validateUsername } from '@quizbyte/shared';
import type { EmailError, PasswordError, UsernameError } from '@quizbyte/shared';

import { useLinkAccount, usePasswordReset, useSignIn, useSignUp } from '@/features/auth/useAccount';
import { analytics } from '@/services/analytics/analytics';
import { getUserMessage } from '@/services/errors';
import { makeStyles, spacing, useThemeColors } from '@/theme';

import { Button, Card, Text, TextField } from '../ui';

const EMAIL_MESSAGES: Record<EmailError, string> = {
  empty: 'Bitte gib deine E-Mail-Adresse ein.',
  invalid: 'Das sieht nicht nach einer E-Mail-Adresse aus.',
  too_long: 'Diese Adresse ist zu lang.',
};

const PASSWORD_MESSAGES: Record<PasswordError, string> = {
  empty: 'Bitte gib ein Passwort ein.',
  too_short: 'Mindestens 8 Zeichen.',
  too_long: 'Das Passwort ist zu lang.',
};

const USERNAME_MESSAGES: Record<UsernameError, string> = {
  too_short: 'Mindestens 3 Zeichen.',
  too_long: 'Maximal 20 Zeichen.',
  invalid_chars: 'Nur a-z, 0-9, Punkt und Unterstrich.',
  invalid_edge: 'Darf nicht mit einem Punkt beginnen oder enden.',
  consecutive_dots: 'Keine zwei Punkte hintereinander.',
  // Deliberately says nothing about which word it was: naming it invites the
  // next attempt, and the server answers with the same sentence.
  blocked: 'Dieser Benutzername ist nicht erlaubt.',
};

interface RegisterFormProps {
  /**
   * A guest session from before the app required an account.
   *
   * Then this is not a new account but an upgrade of the one already playing –
   * same user id, so XP, streak and highscores come along.
   */
  upgradeGuest?: boolean;
  /** Prefilled name when there already is a profile to read one from. */
  initialUsername?: string;
}

/** Creating an account: e-mail, password, name. */
export function RegisterForm({ upgradeGuest = false, initialUsername }: RegisterFormProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const signUp = useSignUp();
  const link = useLinkAccount();
  const pending = signUp.isPending || link.isPending;
  const failure = signUp.error ?? link.error;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(initialUsername ?? '');
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>({});
  const [done, setDone] = useState<string | null>(null);

  const submit = () => {
    const emailCheck = validateEmail(email);
    const passwordCheck = validatePassword(password);
    const usernameCheck = validateUsername(username);
    setErrors({
      email: emailCheck.ok ? undefined : EMAIL_MESSAGES[emailCheck.error],
      password: passwordCheck.ok ? undefined : PASSWORD_MESSAGES[passwordCheck.error],
      username: usernameCheck.ok ? undefined : USERNAME_MESSAGES[usernameCheck.error],
    });
    if (!emailCheck.ok || !passwordCheck.ok || !usernameCheck.ok) return;

    const credentials = { email: emailCheck.value, password: passwordCheck.value };

    if (upgradeGuest) {
      link.mutate(credentials, {
        onSuccess: (result) => {
          analytics.track('account_linked', { confirmationSent: result.status === 'confirmation_sent' });
          setPassword('');
          setDone(
            result.status === 'linked'
              ? 'Fertig. Dein Fortschritt hängt jetzt an deinem Konto.'
              : `Fast fertig: Öffne den Link in der Mail an ${result.email}, dann ist dein Konto aktiv.`,
          );
        },
      });
      return;
    }

    signUp.mutate(
      { ...credentials, username: usernameCheck.value },
      {
        onSuccess: (result) => {
          analytics.track('account_created', { confirmationSent: result.status === 'confirmation_sent' });
          setPassword('');
          // Signed in straight away: the app is already behind this screen, so
          // there is nothing left to say.
          if (result.status === 'signed_in') return;
          setDone(`Wir haben dir eine Mail an ${result.email} geschickt. Öffne den Link darin und melde dich dann an.`);
        },
      },
    );
  };

  if (done) {
    return (
      <Card elevated style={styles.card}>
        <View style={styles.headRow}>
          <Ionicons name="mail-open-outline" size={20} color={colors.success} />
          <Text variant="bodyStrong">Fast geschafft</Text>
        </View>
        <Text variant="caption" color="secondary">
          {done}
        </Text>
      </Card>
    );
  }

  return (
    <>
      {upgradeGuest ? (
        <Card style={styles.note}>
          <Text variant="caption" color="secondary">
            Du hast bisher als Gast gespielt. Dein Fortschritt bleibt erhalten – XP, Level, Streak und Highscores wandern in
            dein neues Konto.
          </Text>
        </Card>
      ) : null}

      <TextField
        label="E-MAIL"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="du@example.de"
      />

      <TextField
        label="PASSWORT"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        hint="Mindestens 8 Zeichen."
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Passwort"
      />

      <TextField
        label="BENUTZERNAME"
        value={username}
        onChangeText={(value) => setUsername(value.toLowerCase())}
        error={errors.username}
        hint="So finden dich Freunde. Lässt sich später im Profil ändern."
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        placeholder="benutzername"
      />

      {failure ? (
        <Text variant="caption" style={{ color: colors.danger }}>
          {getUserMessage(failure)}
        </Text>
      ) : null}

      <Button
        title={pending ? 'Wird erstellt …' : 'Konto erstellen'}
        onPress={submit}
        disabled={pending}
        style={styles.submit}
      />
    </>
  );
}

interface LoginFormProps {
  /** Warns that a guest session is about to be left behind. */
  warnAboutGuest?: boolean;
}

/** Signing in to an account that already exists. */
export function LoginForm({ warnAboutGuest = false }: LoginFormProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const signIn = useSignIn();
  const reset = usePasswordReset();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const go = () => {
    signIn.mutate(
      { email, password },
      {
        onSuccess: () => {
          analytics.track('signed_in', {});
          setPassword('');
        },
      },
    );
  };

  const run = () => {
    const emailCheck = validateEmail(email);
    setErrors({
      email: emailCheck.ok ? undefined : EMAIL_MESSAGES[emailCheck.error],
      // Only checked for being there: an account made under older rules may
      // well have a shorter password than we ask for today, and telling that
      // user their own password is invalid would be nonsense.
      password: password.length === 0 ? PASSWORD_MESSAGES.empty : undefined,
    });
    if (!emailCheck.ok || password.length === 0) return;

    if (!warnAboutGuest) {
      go();
      return;
    }

    Alert.alert(
      'Als anderes Konto anmelden?',
      'Was du bis jetzt als Gast gespielt hast, bleibt auf diesem Gerät zurück und lässt sich nicht mehr aufrufen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Anmelden', onPress: go },
      ],
    );
  };

  const forgotPassword = () => {
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setErrors({ email: 'Trag zuerst deine E-Mail-Adresse ein, dann schicken wir dir einen Link.' });
      return;
    }
    reset.mutate(emailCheck.value, {
      onSuccess: () =>
        Alert.alert(
          'Mail unterwegs',
          `Wenn es ein Konto für ${emailCheck.value} gibt, liegt gleich eine Mail mit einem Link zum Zurücksetzen im Postfach.`,
        ),
      onError: (error) => Alert.alert('Fehler', getUserMessage(error)),
    });
  };

  return (
    <>
      <TextField
        label="E-MAIL"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="du@example.de"
      />

      <TextField
        label="PASSWORT"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        placeholder="Passwort"
        onSubmitEditing={run}
        returnKeyType="go"
      />

      <Pressable
        onPress={forgotPassword}
        disabled={reset.isPending}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Passwort zurücksetzen"
        style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
      >
        <Text variant="label" color="accent">
          {reset.isPending ? 'Wird gesendet …' : 'Passwort vergessen?'}
        </Text>
      </Pressable>

      {warnAboutGuest ? (
        <Card style={styles.note}>
          <Text variant="caption" color="secondary">
            {'Achtung: Dein Gast-Fortschritt bleibt dabei zurück. Willst du ihn behalten, nimm „Konto erstellen“.'}
          </Text>
        </Card>
      ) : null}

      {signIn.isError ? (
        <Text variant="caption" style={{ color: colors.danger }}>
          {getUserMessage(signIn.error)}
        </Text>
      ) : null}

      <Button
        title={signIn.isPending ? 'Wird angemeldet …' : 'Anmelden'}
        onPress={run}
        disabled={signIn.isPending}
        style={styles.submit}
      />
    </>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  note: { marginBottom: spacing.xs },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  forgot: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.6 },
  submit: { marginTop: spacing.sm },
}));
