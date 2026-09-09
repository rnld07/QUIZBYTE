import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useAuthBootstrap } from '@/features/auth/useAuthBootstrap';
import { queryClient } from '@/services/query/queryClient';
import { colors, spacing } from '@/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const quizByteTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={quizByteTheme}>
        <StatusBar style="light" />
        <AuthGate />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Blocks the navigation tree until a (guest) session exists. */
function AuthGate() {
  const { status, errorMessage, retry } = useAuthBootstrap();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'loading') {
    return <View style={styles.fill} />;
  }

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

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="quiz/session" options={{ gestureEnabled: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="quiz/result" options={{ gestureEnabled: false }} />
      <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="legal/[page]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  message: { maxWidth: 320 },
  retry: { marginTop: spacing.md, minWidth: 200 },
});
