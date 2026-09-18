import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { QUIZ_MODE_DEFINITIONS } from '@quizbyte/shared';
import type { QuizMode, QuizModeDefinition } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { ModeCard } from '@/components/quiz/ModeCard';
import { modeImage } from '@/content/modeImages';
import { AppIcon, IconButton, InfoDialog, Screen, Text } from '@/components/ui';
import { useCreateDuel, useFriends } from '@/features/friends/useFriends';
import { useCategories } from '@/features/quiz/useCategories';
import { useStudySheets } from '@/features/study/useStudySheets';
import { RANDOM_CATEGORY_NAME, useStartQuiz } from '@/features/quiz/useStartQuiz';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

/**
 * Comes between tapping a category and the first question: how do you want to
 * play it?
 *
 * A page rather than a sheet – the modes are a real choice with four options,
 * and they deserve the same room as the categories they follow.
 */
export default function QuizModesScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  const router = useRouter();
  // No category id means the "Random" tile: questions from everywhere.
  // `duelWith` turns the page into the mode picker for a challenge.
  const { categoryId, duelWith, from: cameFrom } = useLocalSearchParams<{
    categoryId?: string;
    duelWith?: string;
    /** Set when a study sheet sent us here, so we can walk back to it. */
    from?: string;
  }>();

  /*
    "Lernen" and "Abfragen" point at each other, so tapping back and forth used
    to pile up a screen per tap and take just as many taps to get out of again.
    When the sheet we are heading for is the one directly underneath, we go back
    to it instead of pushing a second copy – the two screens swap places and the
    stack never grows past tab → sheet → modes.
  */
  const openSheet = (sheetId: string) => {
    if (cameFrom === 'study') router.back();
    else router.push({ pathname: '/study/[id]', params: { id: sheetId, from: 'modes' } });
  };
  const categories = useCategories();
  const startQuiz = useStartQuiz();
  const friends = useFriends();
  const createDuel = useCreateDuel(duelWith ?? null);
  const study = useStudySheets();
  const [explained, setExplained] = useState<QuizModeDefinition | null>(null);
  // Which tile was tapped – only that one shows the spinner.
  const [pending, setPending] = useState<QuizMode | null>(null);

  const category = categoryId ? categories.data?.find((entry) => entry.id === categoryId) : undefined;
  const opponent = duelWith ? friends.friends.find((entry) => entry.id === duelWith) : undefined;
  const title = duelWith
    ? (opponent?.displayName ?? opponent?.username ?? 'Duell')
    : (category?.name ?? RANDOM_CATEGORY_NAME);
  const accent = duelWith ? colors.warning : (category?.accentColor ?? colors.primary);
  // The first sheet filed under this category – in a duel there is no category
  // to learn for, so none is offered.
  const sheet = categoryId && !duelWith ? study.sheets.find((entry) => entry.categoryId === categoryId) : undefined;
  /*
    Random draws from every category, so no single sheet belongs to it. The bar
    still earns its place – it just leads to the shelf instead of to one sheet.
  */
  const showAllSheets = !categoryId && !duelWith && study.sheets.length > 0;

  const start = (mode: QuizMode) => {
    // A challenge does not start a round here – it sends the invitation and
    // goes back to the chat, where both sides see it.
    if (duelWith) {
      setPending(mode);
      createDuel.mutate(mode, {
        onSuccess: () => router.back(),
        onSettled: () => setPending(null),
      });
      return;
    }

    // Still loading the categories: without the object there is nothing to
    // start, and the tap is better ignored than answered with an error.
    if (categoryId && !category) return;
    setPending(mode);
    void startQuiz
      .start(category ? { type: 'category', category, mode } : { type: 'random', mode })
      .finally(() => setPending(null));
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <View style={styles.titles}>
          <Text variant="label" style={styles.eyebrow} numberOfLines={1}>
            {duelWith ? `DUELL · ${title.toUpperCase()}` : title.toUpperCase()}
          </Text>
          <Text variant="headline">{duelWith ? 'Wie wollt ihr spielen?' : 'Modus wählen'}</Text>
        </View>
      </View>

      {duelWith ? (
        <Text variant="caption" color="muted" style={styles.duelNote}>
          Ihr spielt beide denselben Modus und dieselben Fragen aus allen Kategorien. Ein Duell hat deshalb eine feste
          Fragenzahl – sonst hätte einer von euch mehr Gelegenheiten als der andere.
        </Text>
      ) : null}

      {startQuiz.error || createDuel.isError ? (
        <View style={styles.inlineError}>
          <Text color="danger">{startQuiz.error ?? getUserMessage(createDuel.error)}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {QUIZ_MODE_DEFINITIONS.map((mode) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            accent={accent}
            loading={pending === mode.id}
            disabled={startQuiz.starting || createDuel.isPending || (Boolean(categoryId) && !category)}
            onPress={() => start(mode.id)}
            onExplain={() => setExplained(mode)}
          />
        ))}
      </View>

      {/* Read before you are asked: when this category has a study sheet, it is
          one tap from the mode tiles. */}
      {sheet ? (
        <Pressable
          onPress={() => openSheet(sheet.id)}
          accessibilityRole="button"
          accessibilityLabel={`Lernzettel ${sheet.title} öffnen`}
          style={({ pressed }) => [styles.studyBar, pressed && styles.pressed]}
        >
          {/* The same layered fill the cards use: a colour wash, then a
              hairline of light along the top edge. A flat block here read as
              a disabled row rather than as the way on. */}
          <View style={styles.studyFill}>
            <LinearGradient
              colors={[`${accent}66`, `${accent}22`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient colors={gradients.edge} style={styles.studyEdge} />
          </View>

          <AppIcon name="study-sheets" fallback="document-text-outline" size={24} glyphSize={18} color={colors.white} />
          <View style={styles.studyText}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ color: colors.white }}>
              Lernen
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {sheet.title}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : showAllSheets ? (
        <Pressable
          onPress={() => router.push('/study')}
          accessibilityRole="button"
          accessibilityLabel="Lernzettel ansehen"
          style={({ pressed }) => [styles.studyBar, pressed && styles.pressed]}
        >
          <View style={styles.studyFill}>
            <LinearGradient
              colors={[`${accent}66`, `${accent}22`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient colors={gradients.edge} style={styles.studyEdge} />
          </View>

          <AppIcon name="study-sheets" fallback="document-text-outline" size={24} glyphSize={18} color={colors.white} />
          <View style={styles.studyText}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ color: colors.white }}>
              Lernen
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              Alle Lernzettel ansehen
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <InfoDialog
        visible={explained !== null}
        eyebrow={explained ? `Modus ${explained.name}` : undefined}
        title={explained?.name ?? ''}
        /*
          In a duel the length is the duel's, not the mode's: both players get
          the same fixed set, because a round that ends when you slip cannot be
          compared between two people who slipped at different points.
        */
        message={
          explained
            ? duelWith
              ? `${explained.description}

Im Duell: ${explained.duelQuestionCount} Fragen für euch beide – bei ${explained.name} sind das die Regeln, aber nicht die Länge.`
              : explained.description
            : undefined
        }
        image={explained ? modeImage(explained.id) : undefined}
        icon="help-circle-outline"
        onClose={() => setExplained(null)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  titles: { flex: 1, gap: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  inlineError: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  studyBar: {
    ...shadows.tile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  // Its own clipping view, so the rounded corners hold without cutting the
  // drop shadow off the bar itself.
  studyFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  studyEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  studyText: { flex: 1, gap: 1 },
  pressed: { opacity: 0.7 },
  duelNote: { marginBottom: spacing.lg, marginTop: -spacing.md },
}));
