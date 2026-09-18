import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';

import { DIFFICULTIES } from '@quizbyte/shared';
import type { Difficulty } from '@quizbyte/shared';

import { BottomSheet, Text } from '@/components/ui';
import { categoryImage } from '@/content/categoryImages';
import { useCategories } from '@/features/quiz/useCategories';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { DIFFICULTY_LABELS, useDifficultyColors } from './DifficultyBreakdown';

/** Welcher der beiden Filter offen ist, oder keiner. */
export type SavedFilterKind = 'level' | 'category' | null;

interface SavedFilterSheetProps {
  open: SavedFilterKind;
  levels: readonly Difficulty[];
  categories: readonly string[];
  onToggleLevel: (value: Difficulty) => void;
  onToggleCategory: (value: string) => void;
  onClearLevels: () => void;
  onClearCategories: () => void;
  onClose: () => void;
}

/**
 * Die Filterauswahl, als Fenster von unten.
 *
 * Bis etwa zur Hälfte hoch: die Liste dahinter bleibt sichtbar, und man sieht
 * beim Tippen, was sich ändert. Vorher hing die Auswahl als Karte unter dem
 * Knopf und legte sich über die Fragen – das war schmaler, aber es verdeckte
 * genau das, worüber man gerade entscheidet.
 *
 * Mehrfachauswahl, deshalb ein Haken je Zeile und kein Punkt: es ist eine
 * Menge von Filtern, keine Entscheidung zwischen ihnen. "Alle" ist die leere
 * Menge und gilt als an, solange sonst nichts an ist.
 */
export function SavedFilterSheet({
  open,
  levels,
  categories,
  onToggleLevel,
  onToggleCategory,
  onClearLevels,
  onClearCategories,
  onClose,
}: SavedFilterSheetProps) {
  const styles = useStyles();
  const difficultyColors = useDifficultyColors();
  // Jede Kategorie wird angeboten, nicht nur die mit gespeicherten Fragen: das
  // leere Ergebnis ist selbst eine Antwort.
  const allCategories = useCategories();

  const isLevel = open === 'level';
  const selected: readonly string[] = isLevel ? levels : categories;
  const count = selected.length;

  return (
    <BottomSheet
      visible={open !== null}
      title={isLevel ? 'Schwierigkeit' : 'Kategorien'}
      eyebrow={count === 0 ? 'ALLE' : `${count} AUSGEWÄHLT`}
      height={0.5}
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <FilterRow
          label="Alle"
          active={count === 0}
          onPress={isLevel ? onClearLevels : onClearCategories}
        />
        <View style={styles.divider} />

        {isLevel
          ? DIFFICULTIES.map((level) => (
              <FilterRow
                key={level}
                label={DIFFICULTY_LABELS[level]}
                // Dieselbe Ampel wie in der Analyse.
                lead={<View style={[styles.levelDot, { backgroundColor: difficultyColors[level] }]} />}
                active={levels.includes(level)}
                onPress={() => onToggleLevel(level)}
              />
            ))
          : (allCategories.data ?? []).map((category) => {
              const art = categoryImage(category.slug);
              return (
                <FilterRow
                  key={category.id}
                  label={category.name}
                  lead={
                    art ? (
                      <Image source={art} style={styles.categoryArt} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                    ) : undefined
                  }
                  active={categories.includes(category.id)}
                  onPress={() => onToggleCategory(category.id)}
                />
              );
            })}
      </ScrollView>
    </BottomSheet>
  );
}

function FilterRow({
  label,
  lead,
  active,
  onPress,
}: {
  label: string;
  lead?: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
    >
      {/* Ein fester Platz, damit Zeilen mit und ohne Bild an derselben Kante
          beginnen – "Alle" hat keines. */}
      <View style={styles.lead}>{lead ?? null}</View>
      <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>
        {label}
      </Text>
      {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { paddingBottom: spacing.md },
  divider: { height: 1, marginVertical: spacing.xs, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowActive: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  lead: { width: 26, alignItems: 'center', flexShrink: 0 },
  levelDot: { width: 12, height: 12, borderRadius: radius.full },
  // Quadratisch mit weicher Ecke: es ist das Bild des Themas, kein Abzeichen.
  categoryArt: { width: 26, height: 26, borderRadius: 7 },
  label: { flex: 1, fontSize: 15, color: colors.textSecondary },
  labelActive: { color: colors.textPrimary, fontWeight: '700' },
}));
