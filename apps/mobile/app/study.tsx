import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { StudyFolderCard } from '@/components/study/StudyFolderCard';
import { StudySheetCard } from '@/components/study/StudySheetCard';
import { EmptyState, ErrorState, IconButton, Screen, SectionHeading, Skeleton, Text } from '@/components/ui';
import type { StudyShelfEntry } from '@/features/study/useStudySheets';
import { useStudySheets } from '@/features/study/useStudySheets';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing } from '@/theme';

/** Every study sheet, laid out as a grid rather than the shelf on "Mehr". */
export default function StudySheetsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const sheets = useStudySheets();
  const { categories, extra } = sheets.sections;

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline">Lernzettel</Text>
      </View>

      {sheets.isLoading ? (
        <View style={styles.grid}>
          <Skeleton width={132} height={190} borderRadius={radius.lg} />
          <Skeleton width={132} height={190} borderRadius={radius.lg} />
        </View>
      ) : sheets.isError ? (
        <ErrorState message={getUserMessage(sheets.error)} onRetry={() => void sheets.refetch()} />
      ) : sheets.shelf.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Noch keine Lernzettel"
          message="Sobald welche hochgeladen sind, findest du sie hier."
        />
      ) : (
        <>
          {/* Sheets on a quiz topic first – those are the ones you can be
              tested on, and the reason most people open this page. A heading
              only appears when there is something under it. */}
          <Section
            title="Kategorien"
            hint="Passend zu den Themen auf der Startseite"
            items={categories}
            styles={styles}
            router={router}
          />
          <Section title="Extra" hint="Zusätzliches Material" items={extra} styles={styles} router={router} />
        </>
      )}
    </Screen>
  );
}

function Section({
  title,
  hint,
  items,
  styles,
  router,
}: {
  title: string;
  hint: string;
  items: StudyShelfEntry[];
  styles: ReturnType<typeof useStyles>;
  router: ReturnType<typeof useRouter>;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <SectionHeading title={title} />
        <Text variant="caption" color="muted" style={styles.hint}>
          {hint}
        </Text>
      </View>

      <View style={styles.grid}>
        {items.map((item) =>
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
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionHead: { gap: 2, marginBottom: spacing.md },
  // Lines up with the title, past the accent bar and its gap.
  hint: { paddingLeft: 3 + spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
}));
