import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { accuracyTone, livesLeft, quizModeById, quizModeLabel } from '@quizbyte/shared';
import type { LevelProgress, SessionSummary } from '@quizbyte/shared';

import type { ModeRecord } from '@/services/api/progressApi';
import type { CompletedQuizSession } from '@/state/quizSessionStore';
import { makeStyles, spacing, useAccuracyColors, useThemeColors } from '@/theme';

import { Card, Text } from '../ui';
import { LevelCard, RecordCard, ResultHero, StatRow } from './ResultParts';

export interface ModeResultProps {
  result: CompletedQuizSession;
  summary: SessionSummary;
  /** XP earned in this round. */
  totalXp: number;
  levelAfter: LevelProgress;
  /** Where the level stood before this round – the blue part of the bar. */
  levelBefore: LevelProgress;
  leveledUp: boolean;
  /** Personal bests *before* this round. */
  record: ModeRecord;
}

/** "FACHINFORMATIK · BLITZ" – the line above the headline number. */
function eyebrowFor(result: CompletedQuizSession): string {
  const name = result.categoryName.toUpperCase();
  return result.mode === 'classic' ? name : `${name} · ${quizModeLabel(result.mode).toUpperCase()}`;
}

/** Red up to 33 %, yellow to 66 %, green above – the same bands as everywhere else. */
function useAccuracyColor(accuracy: number): string {
  return useAccuracyColors()[accuracyTone(accuracy)];
}

/**
 * The plain round: how many of the questions were right.
 *
 * No highscore here on purpose – a fixed set of five is not something you beat,
 * and a "best of 5/5" would say nothing about the round you just played.
 */
export function ClassicResult({ result, summary, totalXp, levelAfter, levelBefore, leveledUp }: ModeResultProps) {
  const accuracyColor = useAccuracyColor(summary.accuracy);

  return (
    <>
      <ResultHero
        eyebrow={eyebrowFor(result)}
        headline={`${summary.correct} / ${summary.answered}`}
        caption={`${summary.accuracy} % richtig`}
        captionColor={accuracyColor}
      />
      <LevelCard level={levelAfter} levelBefore={levelBefore} leveledUp={leveledUp} xp={totalXp} />
    </>
  );
}

/** Sixty seconds: what counts is how much you got through, and how fast. */
export function BlitzResult({ result, summary, totalXp, levelAfter, levelBefore, leveledUp, record }: ModeResultProps) {
  const colors = useThemeColors();
  const accuracyColor = useAccuracyColor(summary.accuracy);
  const limit = quizModeById('blitz').timeLimitSeconds ?? 60;
  const averageMs =
    summary.answered > 0 ? result.attempts.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0) / summary.answered : 0;

  return (
    <>
      <ResultHero
        eyebrow={eyebrowFor(result)}
        headline={String(summary.correct)}
        // The count of right answers is the score of the round – green like a
        // correct answer, not the neutral colour of a plain figure.
        headlineColor={colors.success}
        caption={summary.correct === 1 ? `richtige Antwort in ${limit} Sekunden` : `richtige Antworten in ${limit} Sekunden`}
      />

      <StatRow
        items={[
          { label: 'Beantwortet', value: String(summary.answered) },
          { label: 'Trefferquote', value: `${summary.accuracy} %`, color: accuracyColor },
          // Seconds per question: the number that tells you whether to speed up.
          { label: 'Ø pro Frage', value: `${(averageMs / 1000).toFixed(1)} s` },
        ]}
      />

      <RecordCard
        unit="richtig"
        value={summary.correct}
        best={record.bestCorrect}
        hasHistory={record.rounds > 0}
        firstRoundHint="Deine erste Blitz-Runde – ab jetzt gibt es etwas zu schlagen."
      />

      <LevelCard level={levelAfter} levelBefore={levelBefore} leveledUp={leveledUp} xp={totalXp} />
    </>
  );
}

/** Three lives: the question is how far you got before they ran out. */
export function SurvivalResult({ result, summary, totalXp, levelAfter, levelBefore, leveledUp, record }: ModeResultProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColor = useAccuracyColor(summary.accuracy);
  const total = quizModeById('survival').lives ?? 3;
  const left = livesLeft('survival', result.attempts) ?? 0;
  const survived = left > 0;

  return (
    <>
      <ResultHero
        eyebrow={eyebrowFor(result)}
        headline={String(summary.answered)}
        caption={summary.answered === 1 ? 'Frage überstanden' : 'Fragen überstanden'}
      />

      <Card elevated style={styles.card}>
        <View style={styles.cardRow}>
          <Text variant="bodyStrong">{survived ? 'Noch am Leben' : 'Alle Leben weg'}</Text>
          <View style={styles.hearts}>
            {Array.from({ length: total }, (_, index) => (
              <Ionicons
                key={index}
                name={index < left ? 'heart' : 'heart-outline'}
                size={16}
                color={index < left ? colors.danger : colors.textMuted}
              />
            ))}
          </View>
        </View>
        <View style={styles.cardRow}>
          <Text variant="caption" color="secondary">
            {summary.correct} von {summary.answered} richtig
          </Text>
          <Text variant="caption" style={{ color: accuracyColor }}>
            {summary.accuracy} %
          </Text>
        </View>
      </Card>

      {/*
        Counted in right answers, like every other mode. Counting the questions
        survived would score the wrong thing: three of them were wrong, and a
        "highscore" of seven for four correct answers reads as a mistake.
      */}
      <RecordCard
        unit="richtig"
        value={summary.correct}
        best={record.bestCorrect}
        hasHistory={record.rounds > 0}
        firstRoundHint="Deine erste Survival-Runde – ab jetzt gibt es etwas zu schlagen."
      />

      <LevelCard level={levelAfter} levelBefore={levelBefore} leveledUp={leveledUp} xp={totalXp} />
    </>
  );
}

/**
 * One mistake ends it, so the round is either whole or it is not.
 *
 * `correct === answered` is exactly the test: a wrong answer stops the round, so
 * a run without one can only have ended by reaching the last question.
 */
export function PerfectResult({ result, summary, totalXp, levelAfter, levelBefore, leveledUp, record }: ModeResultProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const perfect = summary.answered > 0 && summary.correct === summary.answered;

  return (
    <>
      <ResultHero
        eyebrow={eyebrowFor(result)}
        headline={perfect ? 'Perfekt' : `Frage ${summary.answered}`}
        headlineColor={colors.primary}
        caption={perfect ? `alle ${summary.answered} Fragen richtig` : 'hier war Schluss'}
      />

      <Card elevated style={[styles.card, perfect && { borderColor: colors.success }]}>
        <View style={styles.cardRow}>
          <View style={styles.rowLabel}>
            <Ionicons
              name={perfect ? 'ribbon' : 'close-circle-outline'}
              size={16}
              color={perfect ? colors.success : colors.danger}
            />
            <Text variant="bodyStrong">{perfect ? 'Runde geschafft' : 'Runde vorbei'}</Text>
          </View>
          {/* Just the count: a round that ends on the first mistake has no
              denominator worth showing – the five it was dealt were never all
              in play. */}
          <Text variant="bodyStrong" style={{ color: perfect ? colors.success : colors.textSecondary }}>
            {summary.correct} richtig
          </Text>
        </View>
        <Text variant="caption" color="secondary">
          {perfect
            ? 'Kein einziger Fehler – genau darum geht es in diesem Modus.'
            : `Bis Frage ${summary.answered} lief alles, dann kam der eine Fehler.`}
        </Text>
        <View style={styles.cardRow}>
          <Text variant="caption" color="muted">
            Perfekte Runden insgesamt
          </Text>
          <Text variant="caption" color="muted">
            {record.perfectRounds + (perfect ? 1 : 0)}
          </Text>
        </View>
      </Card>

      {/*
        The bar measures the round, not the tally: how far you got towards a
        clean run, against the furthest you have ever got. A counter of perfect
        rounds could only ever grow, and its bar would always be full.
      */}
      <RecordCard
        unit="richtig"
        value={summary.correct}
        best={record.bestCorrect}
        hasHistory={record.rounds > 0}
        firstRoundHint="Deine erste perfekte Runde – ab jetzt gibt es etwas zu schlagen."
      />

      <LevelCard level={levelAfter} levelBefore={levelBefore} leveledUp={leveledUp} xp={totalXp} />
    </>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hearts: { flexDirection: 'row', gap: 3 },
}));
