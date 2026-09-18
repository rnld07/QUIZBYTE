import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { computeAccuracy } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { ModeStats } from '@/components/progress/ModeStats';
import { AccuracyTrend, TREND_RANGES } from '@/components/progress/AccuracyTrend';
import type { TrendRange } from '@/components/progress/AccuracyTrend';
import { HistoryDialog } from '@/components/progress/HistoryDialog';
import type { HistoryMetric, HistoryPart, HistoryShape } from '@/components/progress/HistoryDialog';
import { StatGrid, StatTile } from '@/components/progress/StatTile';
import { XpInfoDialog } from '@/components/quiz/XpInfoDialog';
import { AppIcon, IconButton, ProgressRing, Screen, SectionHeading, Text } from '@/components/ui';
import { statIcon } from '@/content/statIcons';
import type { StatIconKey } from '@/content/statIcons';
import { useMyDuelCount } from '@/features/friends/useFriends';
import { useAnswerStats } from '@/features/progress/useAnswerStats';
import { useAccuracyTrend } from '@/features/progress/useAccuracyTrend';
import { useDailyHistory } from '@/features/progress/useDailyHistory';
import { usePerfectSessions } from '@/features/progress/usePerfectSessions';
import { useProgress } from '@/features/progress/useProgress';
import { useModeRecords } from '@/features/quiz/useModeRecords';
import { makeStyles, spacing, useThemeColors } from '@/theme';

/** Matches the ring on the progress tab – see LevelCard. */
const RING_GREEN = '#3DE07E';

/** The six tiles that can open a chart. */
type ChartKey = 'streak' | 'duels' | 'correct' | 'wrong' | 'sessions' | 'perfect';

/**
 * Everything the app knows about how you are doing.
 *
 * A page rather than a sheet: it is five blocks deep, it is scrolled through
 * and returned to, and a dialog that fills the screen is a page pretending not
 * to be one – it cannot be swiped away and loses your place when it closes.
 */
export default function AnalysisScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();

  const { level, progress, streak } = useProgress();
  // From the first attempt per question, like every other number here.
  const answers = useAnswerStats();
  const records = useModeRecords();
  const perfect = usePerfectSessions();
  const [xpInfo, setXpInfo] = useState(false);
  // Which tile's week is open, or null while none is.
  const [chart, setChart] = useState<ChartKey | null>(null);
  // Sieben Tage als Vorgabe: der Zeitraum, in dem sich eine Änderung im
  // eigenen Verhalten überhaupt zeigt, ohne dass die Linie nur rauscht.
  const [trendDays, setTrendDays] = useState<TrendRange>(TREND_RANGES[0].days);
  const trend = useAccuracyTrend(trendDays);
  const history = useDailyHistory();
  const duels = useMyDuelCount();

  const duelsPlayed = duels.count;


  const answered = answers.answered;
  const correct = answers.correct;
  const wrong = Math.max(0, answered - correct);
  const accuracy = computeAccuracy(correct, answered);

  /**
   * What each tile charts: the column of a day it reads, and how it is titled.
   *
   * The streak tile charts days that were played at all – a streak is made of
   * days, and "how long it was" has no daily figure of its own.
   */
  const CHARTS: Record<
    ChartKey,
    {
      title: string;
      value: string;
      metric: HistoryMetric;
      tone: string;
      shape?: HistoryShape;
      against?: HistoryMetric;
      parts?: readonly HistoryPart[];
    }
  > = {
    // Dots, not bars: the only question about a day in a streak is whether it
    // happened, and a bar would answer a question about quantity instead.
    streak: {
      title: 'Gespielte Tage',
      value: `${progress?.longestStreak ?? 0} Tage`,
      metric: 'answered',
      tone: colors.danger,
      shape: 'dots',
    },
    // Split by how they went: a day with three duels is a different day
    // depending on whether they were won or lost, and the colours say which
    // without a word.
    duels: {
      title: 'Duelle',
      value: String(duelsPlayed),
      metric: 'duels',
      tone: colors.warning,
      parts: [
        { metric: 'duelsWon', color: colors.success, label: 'gewonnen' },
        { metric: 'duelsDrawn', color: colors.textMuted, label: 'unentschieden' },
        { metric: 'duelsLost', color: colors.danger, label: 'verloren' },
      ],
    },
    // Against the day's whole: seven right out of eight is a different day
    // from seven out of thirty.
    correct: { title: 'Richtige Antworten', value: String(correct), metric: 'correct', tone: colors.success, against: 'answered' },
    wrong: { title: 'Falsche Antworten', value: String(wrong), metric: 'wrong', tone: colors.danger, against: 'answered' },
    sessions: { title: 'Beendete Quiz', value: String(progress?.totalSessionsCompleted ?? 0), metric: 'sessions', tone: colors.primary },
    perfect: { title: 'Perfekte Quiz', value: String(perfect.count), metric: 'perfect', tone: colors.warning, against: 'sessions' },
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline" style={styles.title}>
          Deine Analyse
        </Text>

        {/* On the title's line, not on one of its own: it is a footnote about
            XP, and a whole row of the page for it was a row too many. */}
        <Pressable
          onPress={() => setXpInfo(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="XP-Verteilung anzeigen"
          style={({ pressed }) => [styles.xpHint, pressed && styles.pressed]}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text variant="label" color="accent">
            XP
          </Text>
        </Pressable>
      </View>

      {/* The level ring with the same three figures beside it as on the tab
          this page is opened from – the same numbers in a different order read
          as different numbers. */}
      <View style={styles.hero}>
        <ProgressRing
          value={level?.progressPercent ?? 0}
          color={RING_GREEN}
          size={118}
          stroke={13}
          accessibilityLabel={`Level ${level?.level ?? 1}, ${level?.progressPercent ?? 0} Prozent`}
        >
          <Text variant="label" color="secondary" style={styles.ringLabel}>
            LEVEL
          </Text>
          <Text style={styles.ringNumber}>{level?.level ?? 1}</Text>
          <Text variant="caption" color="muted" style={styles.ringXp}>
            {level?.xpIntoLevel ?? 0} / {level?.xpForLevel ?? 0}
          </Text>
        </ProgressRing>

        <View style={styles.heroStats}>
          <HeroStat
            icon="flame"
            art="streak"
            color={streak > 0 ? colors.danger : colors.textMuted}
            value={String(streak)}
            label={streak === 1 ? 'Tag Streak' : 'Tage Streak'}
          />
          <HeroStat icon="help" art="answered" color={colors.primary} value={String(answered)} label="beantwortet" />
          <HeroStat icon="trophy" art="correct" color={colors.warning} value={`${accuracy} %`} label="Quote" />
        </View>
      </View>


      {/* Ganz oben, weil es die Frage beantwortet, mit der man die Seite
          öffnet: nicht "wie steht es", sondern "wird es besser". */}
      <Section title="Quote im Verlauf">
        <AccuracyTrend
          points={trend.points}
          days={trendDays}
          loading={trend.isLoading}
          onChangeDays={setTrendDays}
        />
      </Section>
      {/*
        The tiles first: they are the figures somebody comes here for, and each
        one opens the same window on its own week. What used to be an
        "Antworten" block of its own is two of these tiles now – a bar that
        said the same thing as the numbers beside it was a third telling.
      */}
      <Section title="Insgesamt">
        <StatGrid>
          <StatTile
            label="Längste Streak"
            value={`${progress?.longestStreak ?? 0} Tage`}
            icon="flame"
            art="streak"
            tone={colors.danger}
            onPress={() => setChart('streak')}
          />
          <StatTile
            label="Duelle gespielt"
            value={String(duelsPlayed)}
            icon="flash"
            art="duels"
            tone={colors.warning}
            onPress={() => setChart('duels')}
          />
          <StatTile
            label="Richtig"
            value={`${correct}/${answered}`}
            icon="checkmark-circle"
            art="correct"
            tone={colors.success}
            onPress={() => setChart('correct')}
          />
          <StatTile
            label="Falsch"
            value={`${wrong}/${answered}`}
            icon="close-circle"
            art="wrong"
            tone={colors.danger}
            onPress={() => setChart('wrong')}
          />
          <StatTile
            label="Quiz beendet"
            value={String(progress?.totalSessionsCompleted ?? 0)}
            icon="checkmark-done"
            art="sessions"
            tone={colors.primary}
            onPress={() => setChart('sessions')}
          />
          <StatTile
            label="Perfekte Quiz"
            value={String(perfect.count)}
            icon="ribbon"
            art="perfect"
            tone={colors.warning}
            loading={perfect.isLoading}
            onPress={() => setChart('perfect')}
          />
        </StatGrid>
      </Section>

      <Section title="Nach Modus">
        {/* Classic has no score to beat – it is the round without a rule. */}
        <ModeStats recordFor={records.recordFor} loading={records.isLoading} includeClassic={false} />
      </Section>


      {/* A dialog, not an overlay: an overlay is positioned inside whatever
          holds it, and on a page that scrolls that is wherever the page happens
          to be – which is how it ended up somewhere below the fold. */}
      <XpInfoDialog visible={xpInfo} onClose={() => setXpInfo(false)} />

      {/* One window for all six tiles – see HistoryDialog. */}
      <HistoryDialog
        visible={chart !== null}
        title={chart ? CHARTS[chart].title : ''}
        value={chart ? CHARTS[chart].value : ''}
        metric={chart ? CHARTS[chart].metric : 'answered'}
        shape={chart ? CHARTS[chart].shape : undefined}
        against={chart ? CHARTS[chart].against : undefined}
        parts={chart ? CHARTS[chart].parts : undefined}
        tone={chart ? CHARTS[chart].tone : colors.primary}
        days={history.days}
        loading={history.isLoading}
        onClose={() => setChart(null)}
      />
    </Screen>
  );
}

/**
 * One block of the analysis.
 *
 * Every block is marked by its own colour and symbol rather than a line of grey
 * capitals: the page is five blocks deep, and told apart by their headings is
 * the only way it reads as five things instead of one long wall.
 */
/**
 * A part of the page: the heading every other screen uses, then the content.
 *
 * No frame around it. The kacheln and the tiles inside already bring their own
 * edges, and a box around a box read as a page built out of boxes rather than
 * as one that is divided into parts.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <SectionHeading title={title} />
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function HeroStat({
  icon,
  art,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Key of the custom symbol for this figure, when one is registered. */
  art: StatIconKey;
  color: string;
  value: string;
  label: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.heroStat} accessibilityLabel={`${value} ${label}`}>
      <AppIcon source={statIcon(art)} fallback={icon} size={24} glyphSize={20} color={color} />
      <View style={styles.heroStatText}>
        <Text style={styles.heroStatValue}>{value}</Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  pressed: { opacity: 0.6 },

  title: { flex: 1 },
  // Indented: flush against the edge the ring read as something that had
  // slipped out of the page rather than as its heading.
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingLeft: spacing.md,
    marginBottom: spacing.xl,
  },
  ringLabel: { fontSize: 9, letterSpacing: 1.4 },
  ringNumber: { fontSize: 34, fontWeight: '900', letterSpacing: -0.8, lineHeight: 38, color: colors.textPrimary },
  ringXp: { fontSize: 10 },
  heroStats: { flex: 1, gap: spacing.md },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroStatText: { flex: 1 },
  heroStatValue: { fontSize: 19, fontWeight: '800', lineHeight: 23, color: colors.textPrimary },

  xpHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  section: { gap: spacing.md, marginBottom: spacing.xl },
  sectionBody: { gap: spacing.sm },

}));
