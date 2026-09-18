import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import type { StudyFolder, StudySheet } from '@/services/api/studySheetsApi';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Text } from '../ui';
import { STUDY_CARD_HEIGHT, STUDY_CARD_WIDTH } from './StudySheetCard';

interface StudyFolderCardProps {
  folder: StudyFolder;
  sheets: StudySheet[];
  onPress: () => void;
}

/** How many of the folder's sheets are drawn – a third edge is just mush. */
const MAX_VISIBLE = 2;

/** How far the lower sheet is shifted down and to the left, in points. */
const OFFSET = 12;

/**
 * A folder as a pile of its own sheets.
 *
 * Drawn as an actual pile rather than a folder icon: what is in it is other
 * sheets, and a pile says "there is more than one here" without a label. Each
 * shows its own first page, not a blank plate – a folder of two different
 * sheets should look like two different sheets.
 *
 * A folder holding one sheet is drawn as that one sheet: there is no pile to
 * show, and a fake second edge would promise something that is not in there.
 *
 * From two on, the second sheet lies over the first and a little higher. The
 * pile as a whole takes exactly the space of one card: the upper sheet's top
 * edge and the lower sheet's bottom edge are the two lines the loose sheets
 * beside it also sit on. The sheets in a pile are the offset shorter for it,
 * which is the price of having both edges line up – and at 12 pt it is not a
 * difference anyone reads as "smaller".
 */
export function StudyFolderCard({ folder, sheets, onPress }: StudyFolderCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  // Never more than there are: a second edge behind a single sheet is a lie
  // about what is inside.
  const visible = sheets.slice(0, MAX_VISIBLE);
  // A pile has to fit the offset into the same box, so its sheets give up
  // exactly that much. A single sheet keeps the full size of a normal card.
  const inset = visible.length > 1 ? OFFSET : 0;
  const sheetWidth = STUDY_CARD_WIDTH - inset;
  const sheetHeight = STUDY_CARD_HEIGHT - inset;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={folder.title}
      accessibilityHint={`${sheets.length} Lernzettel, öffnen zum Auswählen`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.stack}>
        {/*
          In order, so the last one is painted on top – that is the one whose
          top edge sets the line. The earlier a sheet comes, the further down
          and to the left it sits.
        */}
        {visible.map((sheet, index) => (
          <View
            key={sheet.id}
            style={[
              styles.sheet,
              {
                width: sheetWidth,
                height: sheetHeight,
                top: (visible.length - 1 - index) * OFFSET,
                left: index * OFFSET,
              },
            ]}
          >
            {sheet.pageUrls[0] ? (
              <Image
                source={{ uri: sheet.pageUrls[0] }}
                style={styles.coverImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <Ionicons name="document-text-outline" size={26} color={colors.textMuted} />
            )}
          </View>
        ))}

        {/* How many are in the pile – the edges only say "more than one". */}
        <View style={[styles.badge, { left: sheetWidth - 16, backgroundColor: colors.primary, borderColor: colors.surface }]}>
          <Text variant="label" style={[styles.badgeText, { color: colors.white }]}>
            {sheets.length}
          </Text>
        </View>
      </View>

      <Text variant="bodyStrong" numberOfLines={2} style={styles.title}>
        {folder.title}
      </Text>
      <Text variant="label" color="muted" numberOfLines={1}>
        {sheets.length === 1 ? '1 Lernzettel' : `${sheets.length} Lernzettel`}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  // Exactly a single card, so every edge and the title below it line up with
  // the loose sheets on the shelf.
  card: { width: STUDY_CARD_WIDTH, gap: spacing.xs },
  pressed: { opacity: 0.7 },
  stack: { width: STUDY_CARD_WIDTH, height: STUDY_CARD_HEIGHT },
  // Size and position come from the caller – they depend on whether this is a
  // pile or a lone sheet.
  sheet: {
    ...shadows.tile,
    position: 'absolute',
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // The pages are rendered on white – anything else would show as a border.
  coverImage: { width: '100%', height: '100%', backgroundColor: '#FFFFFF' },
  // On the bottom right corner of the lowest sheet – the one flush with the
  // left edge, whose bottom is the bottom of the whole pile. `left` comes from
  // the caller, since it follows the sheet's width.
  badge: {
    position: 'absolute',
    bottom: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11 },
  title: { fontSize: 13, color: colors.textPrimary },
}));
