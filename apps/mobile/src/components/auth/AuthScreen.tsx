import { useState } from 'react';
import { View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { appInfo } from '@/config/app';
import { makeStyles, spacing } from '@/theme';

import { Logo } from '../brand/Logo';
import { Screen, SegmentedControl, Text } from '../ui';
import { LoginForm, RegisterForm } from './AuthForms';

type Tab = 'register' | 'login';

const TABS = [
  { value: 'register', label: 'Konto erstellen' },
  { value: 'login', label: 'Anmelden' },
] as const;

interface AuthScreenProps {
  /**
   * A guest session left over from before the app required an account.
   *
   * Then this is an upgrade rather than a fresh start, and the screen says so –
   * nobody should have to guess whether signing up costs them their streak.
   */
  upgradeGuest?: boolean;
  /** The guest's current name, to prefill the field with. */
  guestUsername?: string;
}

/**
 * The gate in front of the app.
 *
 * QuizByte is not playable without an account: progress, friends, duels and
 * the chat all hang on a user other people can find and challenge. So this is
 * the first thing a new phone sees, and the last thing after signing out.
 */
export function AuthScreen({ upgradeGuest = false, guestUsername }: AuthScreenProps) {
  const styles = useStyles();
  // Someone opening the app for the first time is here to create an account;
  // someone who signed out is here to sign in. Guessing right saves a tap.
  const [tab, setTab] = useState<Tab>(upgradeGuest ? 'register' : 'login');

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.head}>
        <Logo size={64} />
        <Text variant="title" align="center">
          {appInfo.name}
        </Text>
        <Text variant="caption" color="secondary" align="center" style={styles.claim}>
          {upgradeGuest
            ? 'Sichere deinen Fortschritt mit einem Konto – danach geht es weiter, wo du warst.'
            : 'Quizfragen für die IT-Ausbildung. Melde dich an, dann liegt dein Fortschritt auf jedem Gerät bereit.'}
        </Text>
      </View>

      <SegmentedControl options={TABS} value={tab} onChange={setTab} accessibilityLabel="Konto erstellen oder anmelden" />

      <View style={styles.form}>
        {tab === 'register' ? (
          <RegisterForm upgradeGuest={upgradeGuest} initialUsername={guestUsername} />
        ) : (
          <LoginForm warnAboutGuest={upgradeGuest} />
        )}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  head: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  claim: { maxWidth: 320 },
  form: { gap: spacing.md, marginTop: spacing.lg },
}));
