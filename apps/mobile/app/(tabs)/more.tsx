import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { resolveFrame } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { AppHeader } from '@/components/layout/AppHeader';
import { StudyFolderCard } from '@/components/study/StudyFolderCard';
import { StudySheetCard } from '@/components/study/StudySheetCard';
import { Avatar, Card, ListRow, RowDivider, Screen, SectionHeading, Skeleton, Text } from '@/components/ui';
import { appInfo } from '@/config/app';
import { useProfile } from '@/features/profile/useProfile';
import { useProgress } from '@/features/progress/useProgress';
import { useStudySheets } from '@/features/study/useStudySheets';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

/** How many sheets the shelf shows before "Alle ›" takes over. */
const SHELF_LIMIT = 6;

/**
 * The one row that is not a single colour: the design setting is about colour
 * itself, so its plate carries the whole range.
 */
const DESIGN_GRADIENT = ['#EF4444', '#F1B434', '#22C55E', '#1E8FFF', '#8B5CF6'] as const;

/** Gold – die Farbe, die ein Abo ueberall hat, wo es eines gibt. */
const PREMIUM_GRADIENT = ['#FFE79B', '#F1B434', '#C8901A'] as const;

export default function MoreScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const sheets = useStudySheets();
  const profile = useProfile();
  const { level } = useProgress();

  return (
    <Screen withTabBar scrollToTopKey="more" backdrop={<AmbientBackground />}>
      <AppHeader showLevel={false} />

      {/* Study sheets first: they are what people come to "Mehr" for. */}
      <View style={styles.section}>
        <SectionHeading
          title="Lernzettel"
          trailing={
            <Pressable
              onPress={() => router.push('/study')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Alle Lernzettel anzeigen"
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text variant="label" color="accent">
                Alle ›
              </Text>
            </Pressable>
          }
        />

        {sheets.isLoading ? (
          <View style={styles.shelf}>
            <Skeleton width={132} height={190} borderRadius={radius.lg} />
            <Skeleton width={132} height={190} borderRadius={radius.lg} />
          </View>
        ) : sheets.shelf.length === 0 ? (
          <Card>
            <Text variant="caption" color="muted">
              Noch keine Lernzettel. Sobald welche hochgeladen sind, erscheinen sie hier.
            </Text>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
            {sheets.shelf.slice(0, SHELF_LIMIT).map((item) =>
              item.kind === 'folder' ? (
                <StudyFolderCard
                  key={item.folder.id}
                  folder={item.folder}
                  sheets={item.sheets}
                  onPress={() => router.push({ pathname: '/study/folder/[id]', params: { id: item.folder.id } })}
                />
              ) : (
                <StudySheetCard
                  key={item.sheet.id}
                  sheet={item.sheet}
                  onPress={() => router.push({ pathname: '/study/[id]', params: { id: item.sheet.id } })}
                />
              ),
            )}
          </ScrollView>
        )}
      </View>

      {/* Direkt unter den Lernzetteln, weil es dieselbe Frage betrifft: was
          diese App bietet. Noch ohne Logik – siehe app/subscription.tsx. */}
      <View style={styles.section}>
        <Card padding="xs">
          <ListRow
            icon="sparkles-outline"
            iconFill={PREMIUM_GRADIENT}
            label="Mein Abo verwalten"
            description="Free"
            onPress={() => router.push('/subscription')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card padding="xs">
          {/* The profile row wears the avatar itself, frame and all – it says
              more about whose profile this is than a generic person glyph. */}
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
            icon="settings-outline"
            iconImage="settings"
            iconFill={colors.textMuted}
            label="Einstellungen"
            onPress={() => router.push('/settings')}
          />
          <RowDivider />
          <ListRow icon="color-palette-outline" iconFill={DESIGN_GRADIENT} label="Design" onPress={() => router.push('/design')} />
          <RowDivider />
          <ListRow icon="bulb-outline" iconFill={colors.warning} label="Idee einreichen" onPress={() => router.push('/ideas')} />
        </Card>
      </View>

      {/* Out of the app and onto the account behind it – black plate, because
          that is what the TikTok mark looks like everywhere else. */}
      <View style={styles.section}>
        <Card padding="xs">
          <ListRow
            icon="logo-tiktok"
            iconFill="#010101"
            label={appInfo.tiktok.handle}
            onPress={() => void Linking.openURL(appInfo.tiktok.url)}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card padding="xs">
          <ListRow icon="mail-outline" iconFill={colors.primary} label="Support" onPress={() => router.push('/legal/support')} />
          <RowDivider />
          <ListRow
            icon="lock-closed-outline"
            iconFill={colors.primary}
            label="Datenschutz"
            onPress={() => router.push('/legal/datenschutz')}
          />
          <RowDivider />
          <ListRow
            icon="document-text-outline"
            iconFill={colors.primary}
            label="Impressum"
            onPress={() => router.push('/legal/impressum')}
          />
          <RowDivider />
          <ListRow
            icon="document-text-outline"
            iconFill={colors.primary}
            label="Nutzungsbedingungen"
            onPress={() => router.push('/legal/nutzungsbedingungen')}
          />
          <RowDivider />
          <ListRow
            icon="information-circle-outline"
            iconFill={colors.primary}
            label="Über QuizByte"
            onPress={() => router.push('/legal/about')}
          />
        </Card>
      </View>

      <Text variant="caption" color="muted" align="center">
        {appInfo.name} {appInfo.version}
      </Text>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  // Padding, not margin: a horizontal ScrollView drops the last child's margin.
  shelf: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.md },
  pressed: { opacity: 0.6 },
}));
