import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, IconButton, Screen, Text } from '@/components/ui';
import { appInfo } from '@/config/app';
import { isLegalPageKey, legalPages } from '@/content/legal';
import { spacing } from '@/theme';

export default function LegalPageScreen() {
  const router = useRouter();
  const { page } = useLocalSearchParams<{ page: string }>();
  const content = isLegalPageKey(page) ? legalPages[page] : null;

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline" style={styles.title}>
          {content?.title ?? 'Seite'}
        </Text>
        <View style={styles.spacer} />
      </View>

      {content ? (
        <View style={styles.body}>
          {content.paragraphs.map((paragraph, index) => (
            <Text key={index} color="secondary">
              {paragraph}
            </Text>
          ))}
          {page === 'support' ? (
            <Button
              title="E-Mail schreiben"
              variant="secondary"
              onPress={() => void Linking.openURL(`mailto:${appInfo.supportEmail}?subject=QuizByte%20Support`)}
              style={styles.action}
            />
          ) : null}
          {page === 'about' ? (
            <Text variant="caption" color="muted">
              Version {appInfo.version}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text color="secondary">Diese Seite existiert nicht.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  title: { flex: 1, textAlign: 'center' },
  spacer: { width: 44 },
  body: { gap: spacing.md },
  action: { marginTop: spacing.md },
});
