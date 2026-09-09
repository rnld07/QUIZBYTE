import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme';

interface ScreenProps extends PropsWithChildren {
  /** Scrollable content (default) or a fixed layout. */
  scroll?: boolean;
  /** Apply the top safe-area inset (disable when a native header is shown). */
  withTopInset?: boolean;
  padded?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

/** Base screen container: dark background, safe areas, consistent padding. */
export function Screen({
  children,
  scroll = true,
  withTopInset = true,
  padded = true,
  refreshControl,
  contentContainerStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = withTopInset ? insets.top + spacing.sm : spacing.sm;
  const paddingBottom = insets.bottom + spacing.xl;

  if (!scroll) {
    return (
      <View style={[styles.root, { paddingTop, paddingBottom }, padded && styles.padded]}>{children}</View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[{ paddingTop, paddingBottom }, padded && styles.padded, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: layout.screenPaddingHorizontal },
});
