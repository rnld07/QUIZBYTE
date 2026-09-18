import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { AppIcon, EmptyState, ErrorState, IconButton, Screen, Skeleton, Text } from '@/components/ui';
import { sectionIcon } from '@/content/sectionIcons';
import type { SectionIconKey } from '@/content/sectionIcons';
import { categoryImage } from '@/content/categoryImages';
import { useCategories } from '@/features/quiz/useCategories';
import { useStudySheets } from '@/features/study/useStudySheets';
import { getUserMessage } from '@/services/errors';
import { saveStudySheetImages, saveStudySheetPdf } from '@/services/media/saveStudySheet';
import type { SaveOutcome } from '@/services/media/saveStudySheet';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

/** Which of the two save buttons is working, so only that one shows a spinner. */
type Saving = 'pdf' | 'images' | null;

/**
 * One study sheet, page by page, with the two ways to keep it: the original PDF
 * through the system share sheet, or every page into the photo library.
 */
export default function StudySheetScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { id, from: cameFrom } = useLocalSearchParams<{
    id: string;
    /** Set when the modes screen sent us here, so we can walk back to it. */
    from?: string;
  }>();
  const sheets = useStudySheets();
  const sheet = sheets.sheets.find((entry) => entry.id === id) ?? null;
  /*
    The sheet stores the category's id, and the artwork is registered under its
    slug – so the list is needed to get from one to the other. It is cached and
    shared with the home screen, which has already loaded it by the time anyone
    opens a sheet.
  */
  const categories = useCategories();
  const category = sheet?.categoryId ? categories.data?.find((entry) => entry.id === sheet.categoryId) : undefined;
  const categoryArt = categoryImage(category?.slug);

  /*
    The counterpart of "Lernen" on the modes screen – see the note there. Coming
    from it, "Abfragen" walks back to it rather than pushing another copy.
  */
  const openModes = (categoryId: string) => {
    if (cameFrom === 'modes') router.back();
    else router.push({ pathname: '/quiz/modes', params: { categoryId, from: 'study' } });
  };

  const [saving, setSaving] = useState<Saving>(null);
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);

  const run = (what: Exclude<Saving, null>, task: () => Promise<SaveOutcome>) => {
    setSaving(what);
    setOutcome(null);
    void task()
      .then(setOutcome)
      .finally(() => setSaving(null));
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline" numberOfLines={1} style={styles.title}>
          {sheet?.title ?? 'Lernzettel'}
        </Text>
      </View>

      {sheets.isLoading ? (
        <Skeleton height={320} borderRadius={radius.lg} />
      ) : sheets.isError ? (
        <ErrorState message={getUserMessage(sheets.error)} onRetry={() => void sheets.refetch()} />
      ) : !sheet ? (
        <EmptyState
          icon="document-text-outline"
          title="Lernzettel nicht gefunden"
          message="Vielleicht wurde er inzwischen entfernt."
          actionLabel="Zurück"
          onAction={() => router.back()}
        />
      ) : (
        <>
          {sheet.description ? (
            <Text color="secondary" style={styles.description}>
              {sheet.description}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <SaveButton
              icon="document-outline"
              art="pdf"
              label="Als PDF"
              busy={saving === 'pdf'}
              disabled={saving !== null}
              onPress={() => run('pdf', () => saveStudySheetPdf(sheet.title, sheet.pdfUrl))}
            />
            <SaveButton
              icon="images-outline"
              art="images"
              label="Als Bilder"
              busy={saving === 'images'}
              disabled={saving !== null || sheet.pageUrls.length === 0}
              onPress={() => run('images', () => saveStudySheetImages(sheet.title, sheet.pageUrls))}
            />
          </View>

          {/* Straight from reading to being asked: the sheet knows its category,
              so the round it belongs to is one tap away. */}
          {sheet.categoryId ? (
            <Pressable
              onPress={() => openModes(sheet.categoryId as string)}
              accessibilityRole="button"
              accessibilityLabel="Zu diesem Thema abgefragt werden"
              style={({ pressed }) => [styles.quizBar, pressed && styles.pressed]}
            >
              {/* The topic it asks about, as its own picture – the bar says
                  where it leads before the word does. */}
              {categoryArt ? (
                <Image source={categoryArt} style={styles.quizArt} contentFit="cover" cachePolicy="memory-disk" transition={150} />
              ) : (
                <Ionicons name="help-circle" size={19} color={colors.white} />
              )}
              <Text variant="bodyStrong" style={{ color: colors.white }}>
                Abfragen
              </Text>
            </Pressable>
          ) : null}

          {outcome?.message ? (
            <Text color={outcome.status === 'done' ? 'success' : 'danger'} style={styles.outcome}>
              {outcome.message}
            </Text>
          ) : null}

          {sheet.pageUrls.length === 0 ? (
            <EmptyState
              icon="image-outline"
              title="Keine Seitenvorschau"
              message="Für diesen Lernzettel gibt es keine Bilder – du kannst ihn aber als PDF speichern."
            />
          ) : (
            sheet.pageUrls.map((url, index) => <Page key={url} uri={url} number={index + 1} total={sheet.pageCount} />)
          )}
        </>
      )}
    </Screen>
  );
}

/** A page at full width, in the aspect ratio the image turns out to have. */
function Page({ uri, number, total }: { uri: string; number: number; total: number }) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  // Pages are rendered portrait at a fixed width; this is the ratio of A4 and
  // keeps the placeholder the right height until the real one has loaded.
  const [ratio, setRatio] = useState(0.707);

  return (
    <View style={styles.page}>
      <Image
        source={{ uri }}
        style={[styles.pageImage, { height: (width - spacing.xl * 2) / ratio }]}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={150}
        accessibilityLabel={`Seite ${number} von ${total}`}
        onLoad={(event) => {
          const { width: w, height: h } = event.source;
          if (w > 0 && h > 0) setRatio(w / h);
        }}
      />
      <Text variant="label" color="muted" align="center">
        Seite {number} / {total}
      </Text>
    </View>
  );
}

interface SaveButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Key of the custom symbol for this button, when one is registered. */
  art: SectionIconKey;
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}

function SaveButton({ icon, art, label, busy, disabled, onPress }: SaveButtonProps) {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      style={({ pressed }) => [styles.action, disabled && styles.actionDisabled, pressed && styles.pressed]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <AppIcon source={sectionIcon(art)} fallback={icon} size={24} glyphSize={18} color={colors.white} />
      )}
      <Text variant="label" style={styles.actionText}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { flex: 1, color: colors.textPrimary },
  description: { marginBottom: spacing.md },

  // Square with a soft corner, not a badge: it is the topic's picture, not an
  // avatar.
  quizArt: { width: 30, height: 30, borderRadius: 7 },
  quizBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    // Room on both sides: the pages below start straight after it, and without
    // this the first one ran into the bar.
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  actionDisabled: { opacity: 0.5 },
  actionText: { color: colors.white },
  pressed: { opacity: 0.7 },
  outcome: { marginBottom: spacing.md },

  page: { gap: spacing.xs, marginBottom: spacing.lg },
  pageImage: {
    width: '100%',
    borderRadius: radius.lg,
    // The pages were rendered onto white; showing them on anything else would
    // put a coloured band around every sheet.
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
}));
