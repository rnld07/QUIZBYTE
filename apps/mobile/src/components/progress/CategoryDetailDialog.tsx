import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

import { accuracyTone } from '@quizbyte/shared';
import type { CategoryProgressRow } from '@quizbyte/shared';

import { statIcon } from '@/content/statIcons';
import type { StatIconKey } from '@/content/statIcons';
import { useCategoryDifficultyStats } from '@/features/progress/useDifficultyStats';
import type { QuestionOutcomeFilter } from '@/services/api/questionsApi';
import { makeStyles, radius, spacing, useAccuracyColors, useThemeColors } from '@/theme';

import { AppIcon, BottomSheet, ProgressBar, SectionHeading, Text } from '../ui';
import { CategoryBadge } from './CategoryBadge';
import { DifficultyBreakdown } from './DifficultyBreakdown';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface CategoryDetailDialogProps {
  visible: boolean;
  /** The category to focus on – when null the dialog lists every category. */
  category: CategoryProgressRow | null;
  /** All categories, used for the list underneath the focused one. */
  categories: CategoryProgressRow[];
  /** Focus a category, or pass null to go back to the overview. */
  onSelect: (category: CategoryProgressRow | null) => void;
  /** Opens the question list for one of the category numbers. */
  onOpenQuestions: (filter: QuestionOutcomeFilter) => void;
  /** Starts a quiz of the focused category. */
  onStartQuiz: (category: CategoryProgressRow) => void;
  starting?: boolean;
  onClose: () => void;
}

/**
 * Eine Kategorie im Detail – als Fenster von unten.
 *
 * Geöffnet wird es aus einer Liste, die stehen bleibt: man sieht weiter, wo man
 * war, und wischt es nach unten wieder weg. Der Rückweg zur Übersicht ist
 * deshalb auch kein Link mehr im Kopf – die Übersicht liegt dahinter, sichtbar,
 * und ein zweiter Weg dorthin wäre einer zu viel.
 */
export function CategoryDetailDialog({
  visible,
  category,
  categories,
  onSelect,
  onOpenQuestions,
  onStartQuiz,
  starting,
  onClose,
}: CategoryDetailDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColors = useAccuracyColors();
  // A focused category shows its own numbers only; the list is the overview mode.
  const showList = category === null;

  return (
    <BottomSheet
      visible={visible}
      title={category ? category.label : 'Alle Kategorien'}
      height={0.82}
      onClose={onClose}
    >
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {category ? (
          <CategoryDetail
            category={category}
            onOpenQuestions={onOpenQuestions}
            onStartQuiz={() => onStartQuiz(category)}
            starting={starting}
          />
        ) : null}

        {showList ? (
          <View style={styles.listBlock}>
            {categories.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => onSelect(entry)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.label}, ${entry.accuracy} Prozent`}
                style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
              >
                <CategoryBadge slug={entry.slug} icon={entry.icon} accentColor={entry.accentColor} size={32} muted={!entry.played} />
                <View style={styles.listBody}>
                  <Text style={styles.listLabel} numberOfLines={1}>
                    {entry.label}
                  </Text>
                  <ProgressBar
                    value={entry.accuracy}
                    height={4}
                    color={entry.played ? accuracyColors[accuracyTone(entry.accuracy)] : colors.textMuted}
                    trackColor={`${entry.accentColor ?? colors.primary}33`}
                  />
                </View>
                <View style={styles.listValues}>
                  <Text
                    style={[styles.listPct, entry.played ? { color: accuracyColors[accuracyTone(entry.accuracy)] } : styles.mutedValue]}
                  >
                    {entry.played ? `${entry.accuracy} %` : '–'}
                  </Text>
                  <Text variant="caption" color="muted">
                    {entry.attempts} {entry.attempts === 1 ? 'Frage' : 'Fragen'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function CategoryDetail({
  category,
  onOpenQuestions,
  onStartQuiz,
  starting,
}: {
  category: CategoryProgressRow;
  onOpenQuestions: (filter: QuestionOutcomeFilter) => void;
  onStartQuiz: () => void;
  starting?: boolean;
}) {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColors = useAccuracyColors();
  const accent = category.accentColor ?? colors.primary;
  const wrong = Math.max(0, category.attempts - category.correct);
  const difficulty = useCategoryDifficultyStats(category.id);

  return (
    <View style={styles.detail}>
      <View style={styles.detailHead}>
        {/* Dasselbe Abzeichen wie in den Listenzeilen, damit das Bild der
            Kategorie in die Detailansicht mitkommt. */}
        <CategoryBadge slug={category.slug} icon={category.icon} accentColor={category.accentColor} size={52} />

        <View style={styles.accuracyBlock}>
          {/* Die Zahl führt, die Worte folgen – andersherum war es eine
              Bildunterschrift mit einer Zahl daran. */}
          <View style={styles.accuracyRow}>
            <Text
              style={[styles.accuracyValue, category.played ? { color: accuracyColors[accuracyTone(category.accuracy)] } : styles.mutedValue]}
            >
              {category.accuracy} %
            </Text>
            <Text variant="caption" color="secondary" style={styles.accuracyCaption}>
              richtig beantwortet
            </Text>
          </View>
          <ProgressBar
            value={category.accuracy}
            height={10}
            color={category.played ? accuracyColors[accuracyTone(category.accuracy)] : colors.textMuted}
            trackColor={`${accent}33`}
          />
        </View>
      </View>

      {/* Die drei Zahlen tragen dieselben Bilder wie überall sonst in der App –
          Haken, Kreuz, Fragezeichen. Ohne Kasten darum: sie stehen bereits
          nebeneinander, und drei getönte Felder waren drei Farben zu viel. */}
      <View style={styles.statRow}>
        <Stat art="correct" icon="checkmark-circle" color={colors.success} value={category.correct} label="richtig" onPress={() => onOpenQuestions('correct')} />
        <Stat art="wrong" icon="close-circle" color={colors.danger} value={wrong} label="falsch" onPress={() => onOpenQuestions('wrong')} />
        <Stat art="answered" icon="help" color={colors.primary} value={category.attempts} label="gesamt" onPress={() => onOpenQuestions('all')} />
      </View>

      <View style={styles.block}>
        <SectionHeading title="Nach Schwierigkeit" />
        <DifficultyBreakdown stats={difficulty.stats} loading={difficulty.isLoading} compact />
      </View>

      {/* Direkt in ein Quiz dieser Kategorie */}
      <Pressable
        onPress={onStartQuiz}
        disabled={starting}
        accessibilityRole="button"
        accessibilityLabel={`${category.label} Quiz starten`}
        style={({ pressed }) => [styles.startButton, { backgroundColor: accent }, pressed && styles.startPressed]}
      >
        <Ionicons name="play" size={15} color={colors.white} />
        <Text variant="bodyStrong" style={[styles.startText, { color: colors.white }]}>
          Quiz starten
        </Text>
      </Pressable>
    </View>
  );
}

function Stat({
  art,
  icon,
  color,
  value,
  label,
  onPress,
}: {
  /** Schlüssel des eigenen Bildes, falls eins hinterlegt ist. */
  art: StatIconKey;
  icon: IoniconName;
  color: string;
  value: number;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      accessibilityHint="Zeigt die passenden Fragen"
      style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}
    >
      <AppIcon source={statIcon(art)} fallback={icon} size={26} glyphSize={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  scroll: { flex: 1 },
  body: { paddingBottom: spacing.lg },

  /* Focused category */
  detail: { gap: spacing.lg },
  block: { gap: spacing.md },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  startPressed: { opacity: 0.7 },
  startText: { fontSize: 14, letterSpacing: 0.2 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accuracyBlock: { flex: 1, gap: spacing.sm },
  accuracyRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  accuracyValue: { fontSize: 32, fontWeight: '900', lineHeight: 36, color: colors.textPrimary },
  accuracyCaption: { flex: 1 },
  mutedValue: { color: colors.textMuted },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statPressed: { opacity: 0.6 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.sm },
  statValue: { fontSize: 20, fontWeight: '800', lineHeight: 24 },

  /* Other categories */
  listBlock: { gap: 0 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  listRowPressed: { opacity: 0.7 },
  listBody: { flex: 1, gap: spacing.xs },
  listLabel: { fontSize: 15, color: colors.textPrimary },
  listValues: { alignItems: 'flex-end' },
  listPct: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
}));
