import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { SuspendedScreen } from '@/components/auth/SuspendedScreen';
import { Button, Text } from '@/components/ui';
import { useAuthBootstrap } from '@/features/auth/useAuthBootstrap';
import { useFeatureSync } from '@/features/flags/useFeatureSync';
import { useProfile } from '@/features/profile/useProfile';
import { queryClient } from '@/services/query/queryClient';
import { useAuthStore } from '@/state/authStore';
import { makeStyles, QuizByteTheme, spacing, useTheme, useThemeColors } from '@/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Outside the navigation theme: that one has to read the colours too. */}
      <QuizByteTheme>
        <NavigationChrome />
      </QuizByteTheme>
    </QueryClientProvider>
  );
}

/**
 * Feeds the app palette into React Navigation and the status bar.
 *
 * Navigation paints the area around the screens (headers, card background), so
 * it needs the same colours – otherwise a light screen would sit in a dark
 * frame during transitions.
 */
function NavigationChrome() {
  const { scheme, colors } = useTheme();

  const navigationTheme = {
    ...(scheme === 'light' ? DefaultTheme : DarkTheme),
    colors: {
      ...(scheme === 'light' ? DefaultTheme : DarkTheme).colors,
      background: colors.background,
      card: colors.background,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <AuthGate />
    </ThemeProvider>
  );
}

/** Blocks the navigation tree until somebody is signed in. */
function AuthGate() {
  const styles = useStyles();
  const colors = useThemeColors();
  const { status, errorMessage, retry } = useAuthBootstrap();
  // Einmal je Sitzung, sobald die App steht – siehe useFeatureSync.
  useFeatureSync();
  const isGuest = useAuthStore((state) => state.isGuest);
  const profile = useProfile();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'loading') {
    return <View style={styles.fill} />;
  }

  // Before the account checks: `isGuest` defaults to true, so a failed start
  // would otherwise be answered with a sign-in screen that cannot work.
  if (status === 'error') {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text variant="headline" align="center">
          QuizByte konnte nicht starten
        </Text>
        <Text color="secondary" align="center" style={styles.message}>
          {errorMessage}
        </Text>
        <Button title="Erneut versuchen" onPress={() => void retry()} style={styles.retry} />
      </View>
    );
  }

  if (status === 'signed-out') {
    return <AuthScreen />;
  }

  // A guest session from before the app required an account. Not sent away –
  // their progress is still on it, and signing up from here keeps it.
  if (isGuest) {
    return <AuthScreen upgradeGuest guestUsername={profile.data?.username} />;
  }

  /*
    Suspended by an admin. The wall is here so the account is told what is going
    on instead of walking into failing writes everywhere – the block itself is
    in the policies, and holds whether this screen is shown or not.
  */
  if (profile.data?.suspendedAt) {
    return <SuspendedScreen reason={profile.data.suspendedReason} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        /*
          The platform's own push, not a fade. On iOS the back-swipe drags the
          screen out from under your finger and shows the one beneath – a fade
          has nothing to drag, so the gesture only ever snapped at the end.
        */
        animation: 'default',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" />
      {/* The swipe leaves the round like the arrow does – see the beforeRemove
          listener in the screen. */}
      <Stack.Screen name="quiz/session" options={{ animation: 'slide_from_right' }} />
      {/*
        The back-swipe leads home, not back into the round: finishing replaces
        the session screen, so what lies under the result is always the tabs.
        The gesture was off to keep anyone from swiping back into a round that
        was already scored – with the replace in place there is no such round.
      */}
      <Stack.Screen name="quiz/result" />
      <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="account" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ideas" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="design" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="analysis" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="blocked" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="legal/[page]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  fill: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  message: { maxWidth: 320 },
  retry: { marginTop: spacing.md, minWidth: 200 },}));
