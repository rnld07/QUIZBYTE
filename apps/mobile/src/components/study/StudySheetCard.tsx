import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import type { StudySheet } from '@/services/api/studySheetsApi';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Text } from '../ui';

interface StudySheetCardProps {
  sheet: StudySheet;
  onPress: () => void;
}

/**
 * One study sheet as a card: the first page as the preview, the title beside it.
 *
 * The preview is the actual first page, not an icon – a shelf of study sheets is
 * recognised by what is on them.
 */
export function StudySheetCard({ sheet, onPress }: StudySheetCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const cover = sheet.pageUrls[0];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sheet.title}
      accessibilityHint={`${sheet.pageCount} Seiten, öffnen zum Ansehen und Speichern`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cover}>
        {/* The picture is clipped by its own view, a hair inside the border.
            Clipping and bordering the same view leaves the border drawn on top
            of the clipped edge, and the two curves never quite line up – which
            is what made the corners look ragged. */}
        <View style={styles.coverClip}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.coverImage} contentFit="cover" cachePolicy="memory-disk" transition={150} />
          ) : (
            <Ionicons name="document-text-outline" size={26} color={colors.textMuted} />
          )}
        </View>
      </View>

      <Text variant="bodyStrong" numberOfLines={2} style={styles.title}>
        {sheet.title}
      </Text>
      <Text variant="label" color="muted" numberOfLines={1}>
        {sheet.pageCount === 1 ? '1 Seite' : `${sheet.pageCount} Seiten`}
      </Text>
    </Pressable>
  );
}

/** Width of one card in the horizontal shelf. */
export const STUDY_CARD_WIDTH = 132;

/** Roughly a sheet of paper, so a preview is not cropped to a square. */
export const STUDY_CARD_ASPECT = 0.72;

/** Height that follows from the two above – a folder's pile needs the figure. */
export const STUDY_CARD_HEIGHT = Math.round(STUDY_CARD_WIDTH / STUDY_CARD_ASPECT);

const useStyles = makeStyles((colors, shadows) => ({
  card: {
    width: STUDY_CARD_WIDTH,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.7 },
  cover: {
    ...shadows.tile,
    width: STUDY_CARD_WIDTH,
    aspectRatio: STUDY_CARD_ASPECT,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverClip: {
    flex: 1,
    borderRadius: radius.lg - 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The pages are rendered on white – anything else would show as a border.
  coverImage: { width: '100%', height: '100%', backgroundColor: '#FFFFFF' },
  title: { fontSize: 13, color: colors.textPrimary },
}));
