import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { features } from '@quizbyte/shared';

import { AppHeader } from '@/components/layout/AppHeader';
import { Card, ListRow, RowDivider, Screen, Text } from '@/components/ui';
import { appInfo } from '@/config/app';
import { spacing } from '@/theme';

export default function MoreScreen() {
  const router = useRouter();

  return (
    <Screen>
      <AppHeader />

      <View style={styles.section}>
        <Card padding="xs">
          <ListRow icon="person-outline" label="Profil" onPress={() => router.push('/profile')} />
          <RowDivider />
          <ListRow icon="settings-outline" label="Einstellungen" onPress={() => router.push('/settings')} />
        </Card>
      </View>

      {features.pro ? (
        <View style={styles.section}>
          <Card padding="xs">
            <ListRow icon="sparkles-outline" label="Pro verwalten" onPress={() => undefined} />
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <Card padding="xs">
          <ListRow icon="mail-outline" label="Support" onPress={() => router.push('/legal/support')} />
          <RowDivider />
          <ListRow icon="lock-closed-outline" label="Datenschutz" onPress={() => router.push('/legal/datenschutz')} />
          <RowDivider />
          <ListRow icon="document-text-outline" label="Impressum" onPress={() => router.push('/legal/impressum')} />
          <RowDivider />
          <ListRow icon="document-text-outline" label="Nutzungsbedingungen" onPress={() => router.push('/legal/nutzungsbedingungen')} />
          <RowDivider />
          <ListRow icon="information-circle-outline" label="Über QuizByte" onPress={() => router.push('/legal/about')} />
        </Card>
      </View>

      <Text variant="caption" color="muted" align="center">
        {appInfo.name} {appInfo.version}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
});
