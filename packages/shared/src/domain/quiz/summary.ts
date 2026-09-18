import type { AttemptResult, QuizQuestion } from '../../types/domain';
import { computeAccuracy } from '../stats/accuracy';

export interface SessionTopicResult {
  label: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface SessionSummary {
  totalQuestions: number;
  answered: number;
  correct: number;
  accuracy: number;
  /** XP from answers only (session bonus is added by the server on completion). */
  answerXp: number;
  /** Every topic sharing the best accuracy of the round. */
  strongestTopics: SessionTopicResult[];
  /**
   * Every topic sharing the worst accuracy – empty when nothing was actually
   * weaker than the rest (a flawless round has no weak spot).
   */
  weakestTopics: SessionTopicResult[];
}

function topicLabel(question: QuizQuestion): string {
  return question.subcategory ?? question.categoryName;
}

/**
 * Summarises one finished (or abandoned) session from its attempts.
 * Strongest/weakest topic are only reported when at least two different topics
 * were played, otherwise the information is meaningless.
 */
export function summarizeSession(
  questions: readonly QuizQuestion[],
  attempts: readonly AttemptResult[],
): SessionSummary {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const topics = new Map<string, SessionTopicResult>();

  // A repeat is practice and counts for nothing – see AttemptResult.isRepeat.
  const scored = attempts.filter((attempt) => !attempt.isRepeat);

  let correct = 0;
  let answerXp = 0;
  for (const attempt of scored) {
    if (attempt.isCorrect) correct += 1;
    answerXp += attempt.xpEarned;
    const question = byId.get(attempt.questionId);
    if (!question) continue;
    const label = topicLabel(question);
    const entry = topics.get(label) ?? { label, attempts: 0, correct: 0, accuracy: 0 };
    entry.attempts += 1;
    if (attempt.isCorrect) entry.correct += 1;
    topics.set(label, entry);
  }

  const ranked = [...topics.values()]
    .map((topic) => ({ ...topic, accuracy: computeAccuracy(topic.correct, topic.attempts) }))
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label));

  // A single topic says nothing about strong or weak.
  const hasComparison = ranked.length >= 2;
  const best = ranked[0]?.accuracy ?? 0;
  const worst = ranked[ranked.length - 1]?.accuracy ?? 0;
  const strongestTopics = hasComparison ? ranked.filter((topic) => topic.accuracy === best) : [];
  // When the worst topic matches the best there is no weak spot to report.
  const weakestTopics = hasComparison && worst < best ? ranked.filter((topic) => topic.accuracy === worst) : [];

  return {
    totalQuestions: questions.length,
    answered: scored.length,
    correct,
    accuracy: computeAccuracy(correct, scored.length),
    answerXp,
    strongestTopics,
    weakestTopics,
  };
}
