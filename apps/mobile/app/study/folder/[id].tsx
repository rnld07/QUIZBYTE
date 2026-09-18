import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { StudySheetCard } from '@/components/study/StudySheetCard';
import { EmptyState, ErrorState, IconButton, Screen, Skeleton, Text } from '@/components/ui';
import { useStudyFolder } from '@/features/study/useStudySheets';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing } from '@/theme';

/**
 * What is inside one folder.
 *
 * The step between the shelf and a sheet: the pile is opened, you pick the one
 * you meant – Windows or macOS, say – and from there it is the usual sheet view
 * with the pages and the save buttons.
 */
export default function StudyFolderScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const study = useStudyFolder(id);

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline" numberOfLines={1} style={styles.heading}>
          {study.folder?.title ?? 'Ordner'}
        </Text>
      </View>

      {study.folder?.description ? (
        <Text variant="caption" color="muted" style={styles.intro}>
          {study.folder.description}
        </Text>
      ) : null}

      {study.isLoading ? (
        <View style={styles.grid}>
          <Skeleton width={132} height={190} borderRadius={radius.lg} />
          <Skeleton width={132} height={190} borderRadius={radius.lg} />
        </View>
      ) : study.isError ? (
        <ErrorState message={getUserMessage(study.error)} onRetry={() => void study.refetch()} />
      ) : study.sheets.length === 0 ? (
        // Also what you see when the folder itself is gone – from here the two
        // are the same thing: there is nothing to open.
        <EmptyState
          icon="documents-outline"
          title="Nichts in diesem Ordner"
          message="Vielleicht wurde er gerade geleert. Geh zurück zur Übersicht."
        />
      ) : (
        <View style={styles.grid}>
          {study.sheets.map((sheet) => (
            <StudySheetCard
              key={sheet.id}
              sheet={sheet}
              onPress={() => router.push({ pathname: '/study/[id]', params: { id: sheet.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  heading: { flex: 1 },
  intro: { marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
}));
