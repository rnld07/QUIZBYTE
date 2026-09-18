import { quizConfig } from '../../config/quiz';
import type { AttemptResult } from '../../types/domain';

export const QUIZ_MODES = ['classic', 'blitz', 'survival', 'perfect'] as const;
export type QuizMode = (typeof QUIZ_MODES)[number];

/** What a round plays like, independent of where its questions come from. */
export interface QuizModeDefinition {
  id: QuizMode;
  name: string;
  /** The one line on the mode card. */
  tagline: string;
  /** The longer text behind the ⓘ. */
  description: string;
  /** How many questions a solo round draws – an upper bound for open modes. */
  questionCount: number;
  /**
   * True when the mode has no question count of its own.
   *
   * Such a round ends on its own rule and nothing else: the clock, the last
   * life, the first mistake. It is still dealt a finite set – there is no
   * infinite supply of questions – but reaching the end of it is a floor, not
   * the rule, and the screen does not count towards it.
   */
  openEnded: boolean;
  /** How many a duel draws; both players share this fixed set. */
  duelQuestionCount: number;
  /** Seconds for the whole round; null when untimed. */
  timeLimitSeconds: number | null;
  /** Wrong answers allowed before the round ends; null when unlimited. */
  lives: number | null;
}

export const DEFAULT_QUIZ_MODE: QuizMode = 'classic';

/**
 * The four ways to play.
 *
 * Timed and life-limited rounds draw a deliberately large set: they end on the
 * clock or on the last life, and running out of questions first would cut them
 * short for the wrong reason.
 */
const DEFINITIONS: Record<QuizMode, QuizModeDefinition> = {
  classic: {
    id: 'classic',
    name: 'Klassisch',
    tagline: `Normales Quiz, ${quizConfig.DEFAULT_QUIZ_LENGTH} Fragen`,
    description:
      `${quizConfig.DEFAULT_QUIZ_LENGTH} Fragen ohne Zeitdruck und ohne Limit. Nach jeder Antwort siehst du die ` +
      'Erklärung und gehst weiter, wenn du so weit bist. Eine falsche Antwort beendet die Runde nicht.',
    questionCount: quizConfig.DEFAULT_QUIZ_LENGTH,
    duelQuestionCount: 5,
    openEnded: false,
    timeLimitSeconds: null,
    lives: null,
  },
  blitz: {
    id: 'blitz',
    name: 'Blitz',
    tagline: '60 Sekunden, so viele Fragen wie möglich',
    description:
      'Die Uhr läuft ab der ersten Frage und hält nicht an – auch nicht bei der Erklärung. Beantworte in 60 Sekunden ' +
      'so viele Fragen wie du schaffst. Ist die Zeit um, endet die Runde sofort, und du bekommst XP für alles, was du ' +
      'bis dahin richtig hattest.',
    questionCount: quizConfig.OPEN_ROUND_LENGTH,
    duelQuestionCount: 20,
    openEnded: true,
    timeLimitSeconds: 60,
    lives: null,
  },
  survival: {
    id: 'survival',
    name: 'Survival',
    tagline: '3 Leben, spiele bis du raus bist',
    description:
      'Du startest mit drei Leben. Jede falsche Antwort kostet eines, bei null ist die Runde vorbei. Die Zeit spielt ' +
      'keine Rolle – nur, wie weit du kommst.',
    questionCount: quizConfig.OPEN_ROUND_LENGTH,
    // Forty in a duel: three lives are a lot of room, and a shorter set ends
    // with both players still standing and nothing decided.
    duelQuestionCount: 40,
    openEnded: true,
    timeLimitSeconds: null,
    lives: 3,
  },
  perfect: {
    id: 'perfect',
    name: 'Perfekte Runde',
    tagline: 'Ein Fehler = Runde vorbei',
    description:
      'Keine zweite Chance: Die erste falsche Antwort beendet die Runde sofort. Solange du richtig liegst, geht es ' +
      'weiter – wie weit du kommst, hängt nur an dir.',
    questionCount: quizConfig.OPEN_ROUND_LENGTH,
    // Five was too few to separate two players who both get five right.
    duelQuestionCount: 20,
    openEnded: true,
    timeLimitSeconds: null,
    lives: 1,
  },
};

/** In the order they are offered. */
export const QUIZ_MODE_DEFINITIONS: readonly QuizModeDefinition[] = QUIZ_MODES.map((id) => DEFINITIONS[id]);

export function isQuizMode(value: unknown): value is QuizMode {
  return typeof value === 'string' && (QUIZ_MODES as readonly string[]).includes(value);
}

/** Falls back to the classic mode, so an unknown id can never break a round. */
export function quizModeById(id: string | null | undefined): QuizModeDefinition {
  return isQuizMode(id) ? DEFINITIONS[id] : DEFINITIONS[DEFAULT_QUIZ_MODE];
}

/** The mode's name as it is written out in the UI. */
export function quizModeLabel(id: string | null | undefined): string {
  return quizModeById(id).name;
}

export function countMistakes(attempts: readonly AttemptResult[]): number {
  // A repeat is practice: getting it wrong again must not cost a life.
  return attempts.filter((attempt) => !attempt.isCorrect && !attempt.isRepeat).length;
}

/** How many lives are left, or null in a mode that has none. */
export function livesLeft(mode: QuizMode, attempts: readonly AttemptResult[]): number | null {
  const lives = quizModeById(mode).lives;
  if (lives === null) return null;
  return Math.max(0, lives - countMistakes(attempts));
}

export interface RoundState {
  mode: QuizMode;
  attempts: readonly AttemptResult[];
  /** How many questions the round was dealt. */
  questionCount: number;
  /** Milliseconds left on the clock; null or omitted in an untimed mode. */
  remainingMs?: number | null;
}

/**
 * True when nothing more can be played: the lives are gone, the clock has run
 * out, or the last question has been answered.
 *
 * Answers for the state *after* the given attempts, so the quiz can ask right
 * after an answer whether its button should say "Ergebnis anzeigen".
 */
export function isRoundOver({ mode, attempts, questionCount, remainingMs }: RoundState): boolean {
  if (remainingMs !== null && remainingMs !== undefined && remainingMs <= 0) return true;
  const lives = quizModeById(mode).lives;
  if (lives !== null && countMistakes(attempts) >= lives) return true;
  return attempts.length >= questionCount;
}
